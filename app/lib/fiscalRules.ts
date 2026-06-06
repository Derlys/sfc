export type PaymentMethod = "wise" | "deel" | "crypto" | "payoneer" | "other";

export type SimulatorInput = {
  monthlyIncomeUsd: number;
  paymentMethod: PaymentMethod;
  hasPrepaidMedicine: boolean;
  hasDependents: boolean;
};

export type Scenario = {
  annualTaxCop: number;
  annualSocialSecurityCop: number;
  taxableIncomeCop: number;
  taxRateLabel: string;
};

export type SimulationResult = {
  annualIncomeCop: number;
  annualIncomeUsd: number;
  annualIncomeUvt: number;
  ibcCop: number;
  ordinary: Scenario;
  simple: Scenario;
  taxSavingsCop: number;
  socialSecuritySavingsCop: number;
  totalSavingsCop: number;
  simpleEligible: boolean;
  simpleRate: number;
  assumptions: string[];
};

export const FISCAL_RULES_2026 = {
  uvtCop: 52374,
  usdToCop: 4000,
  ibcRate: 0.4,
  healthRate: 0.125,
  pensionRate: 0.16,
  prepaidMedicineAnnualDeductionCop: 16 * 52374 * 12,
  dependentDeductionRate: 0.1,
  dependentDeductionAnnualCapCop: 32 * 52374 * 12,
  exemptLaborIncomeRate: 0.25,
  exemptLaborIncomeAnnualCapUvt: 2880,
  simpleProfessionalCapUvt: 12000,
  simpleSocialSecurityReliefRate: 0.35,
  naturalPersonTaxBrackets: [
    { fromUvt: 0, toUvt: 1090, marginalRate: 0, baseTaxUvt: 0 },
    { fromUvt: 1090, toUvt: 1700, marginalRate: 0.19, baseTaxUvt: 0 },
    { fromUvt: 1700, toUvt: 4100, marginalRate: 0.28, baseTaxUvt: 116 },
    { fromUvt: 4100, toUvt: 8670, marginalRate: 0.33, baseTaxUvt: 788 },
    { fromUvt: 8670, toUvt: 18970, marginalRate: 0.35, baseTaxUvt: 2296 },
    { fromUvt: 18970, toUvt: 31000, marginalRate: 0.37, baseTaxUvt: 5901 },
    { fromUvt: 31000, toUvt: Infinity, marginalRate: 0.39, baseTaxUvt: 10352 },
  ],
  simpleProfessionalRates: [
    { fromUvt: 0, toUvt: 6000, rate: 0.073 },
    { fromUvt: 6000, toUvt: 12000, rate: 0.083 },
  ],
} as const;

export function simulateFiscalComparison(input: SimulatorInput): SimulationResult {
  const monthlyIncomeUsd = Number.isFinite(input.monthlyIncomeUsd)
    ? Math.max(0, input.monthlyIncomeUsd)
    : 0;
  const annualIncomeUsd = monthlyIncomeUsd * 12;
  const annualIncomeCop = annualIncomeUsd * FISCAL_RULES_2026.usdToCop;
  const annualIncomeUvt = annualIncomeCop / FISCAL_RULES_2026.uvtCop;
  const ibcCop = annualIncomeCop * FISCAL_RULES_2026.ibcRate;
  const annualSocialSecurityCop =
    ibcCop *
    (FISCAL_RULES_2026.healthRate + FISCAL_RULES_2026.pensionRate);

  const deductionsCop =
    (input.hasPrepaidMedicine
      ? FISCAL_RULES_2026.prepaidMedicineAnnualDeductionCop
      : 0) +
    (input.hasDependents
      ? Math.min(
          annualIncomeCop * FISCAL_RULES_2026.dependentDeductionRate,
          FISCAL_RULES_2026.dependentDeductionAnnualCapCop,
        )
      : 0);

  const exemptLaborIncomeCop = Math.min(
    Math.max(annualIncomeCop - deductionsCop, 0) *
      FISCAL_RULES_2026.exemptLaborIncomeRate,
    FISCAL_RULES_2026.exemptLaborIncomeAnnualCapUvt *
      FISCAL_RULES_2026.uvtCop,
  );
  const ordinaryTaxableIncomeCop = Math.max(
    annualIncomeCop - annualSocialSecurityCop - deductionsCop - exemptLaborIncomeCop,
    0,
  );
  const ordinaryTax = calculateNaturalPersonTax(ordinaryTaxableIncomeCop);

  const simpleRate = getSimpleProfessionalRate(annualIncomeUvt);
  const simpleEligible =
    annualIncomeCop > 0 &&
    annualIncomeUvt < FISCAL_RULES_2026.simpleProfessionalCapUvt;
  const simpleTax = simpleEligible ? annualIncomeCop * simpleRate : 0;
  const simpleSocialSecurityCop = simpleEligible
    ? annualSocialSecurityCop *
      (1 - FISCAL_RULES_2026.simpleSocialSecurityReliefRate)
    : annualSocialSecurityCop;

  const taxSavingsCop = ordinaryTax - simpleTax;
  const socialSecuritySavingsCop = annualSocialSecurityCop - simpleSocialSecurityCop;

  return {
    annualIncomeCop,
    annualIncomeUsd,
    annualIncomeUvt,
    ibcCop,
    ordinary: {
      annualTaxCop: ordinaryTax,
      annualSocialSecurityCop,
      taxableIncomeCop: ordinaryTaxableIncomeCop,
      taxRateLabel: "Tabla progresiva Art. 241",
    },
    simple: {
      annualTaxCop: simpleTax,
      annualSocialSecurityCop: simpleSocialSecurityCop,
      taxableIncomeCop: annualIncomeCop,
      taxRateLabel: `${formatPercent(simpleRate)} sobre ingresos brutos`,
    },
    taxSavingsCop,
    socialSecuritySavingsCop,
    totalSavingsCop: taxSavingsCop + socialSecuritySavingsCop,
    simpleEligible,
    simpleRate,
    assumptions: [
      `TRM fija MVP: $${FISCAL_RULES_2026.usdToCop.toLocaleString("es-CO")} COP/USD.`,
      `UVT 2026: $${FISCAL_RULES_2026.uvtCop.toLocaleString("es-CO")} COP.`,
      "Perfil SIMPLE asumido: servicios profesionales, consultoría o actividad intelectual.",
      "Seguridad social estimada sobre IBC del 40%: salud 12.5% y pensión 16%.",
    ],
  };
}

function calculateNaturalPersonTax(taxableIncomeCop: number) {
  const taxableUvt = taxableIncomeCop / FISCAL_RULES_2026.uvtCop;
  const bracket =
    FISCAL_RULES_2026.naturalPersonTaxBrackets.find(
      (item) => taxableUvt > item.fromUvt && taxableUvt <= item.toUvt,
    ) ?? FISCAL_RULES_2026.naturalPersonTaxBrackets[0];

  const taxUvt =
    (taxableUvt - bracket.fromUvt) * bracket.marginalRate + bracket.baseTaxUvt;
  return Math.max(0, taxUvt * FISCAL_RULES_2026.uvtCop);
}

function getSimpleProfessionalRate(annualIncomeUvt: number) {
  return (
    FISCAL_RULES_2026.simpleProfessionalRates.find(
      (item) => annualIncomeUvt >= item.fromUvt && annualIncomeUvt < item.toUvt,
    )?.rate ?? FISCAL_RULES_2026.simpleProfessionalRates.at(-1)?.rate ?? 0
  );
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}
