"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { initAnalytics, trackEvent } from "@/app/lib/analytics";
import {
  FISCAL_RULES_2026,
  PaymentMethod,
  simulateFiscalComparison,
} from "@/app/lib/fiscalRules";

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: "wise", label: "Wise" },
  { value: "deel", label: "Deel" },
  { value: "crypto", label: "Crypto" },
  { value: "payoneer", label: "Payoneer" },
  { value: "other", label: "Otro" },
];

const whatsappMessage = encodeURIComponent(
  "Hola, quiero ayuda para pasarme al Régimen SIMPLE u optimizar mi declaración. Vengo del simulador.",
);
const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(
  /\D/g,
  "",
);
const ctaHref =
  process.env.NEXT_PUBLIC_CTA_URL ??
  (whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
    : "#");

export default function SimpleSimulator() {
  const [monthlyIncomeUsd, setMonthlyIncomeUsd] = useState("4500");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("deel");
  const [hasPrepaidMedicine, setHasPrepaidMedicine] = useState(false);
  const [hasDependents, setHasDependents] = useState(false);
  const trackedCompletionKey = useRef("");

  const numericIncome = Number(monthlyIncomeUsd);
  const result = useMemo(
    () =>
      simulateFiscalComparison({
        monthlyIncomeUsd: numericIncome,
        paymentMethod,
        hasPrepaidMedicine,
        hasDependents,
      }),
    [numericIncome, paymentMethod, hasPrepaidMedicine, hasDependents],
  );
  const hasValidIncome = Number.isFinite(numericIncome) && numericIncome > 0;

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    const completionKey = [
      monthlyIncomeUsd,
      paymentMethod,
      hasPrepaidMedicine,
      hasDependents,
    ].join(":");

    if (!hasValidIncome || trackedCompletionKey.current === completionKey) {
      return;
    }

    trackedCompletionKey.current = completionKey;
    trackEvent("simulator_completed", {
      payment_method: paymentMethod,
      monthly_income_usd: numericIncome,
      simple_eligible: result.simpleEligible,
    });
  }, [
    hasDependents,
    hasPrepaidMedicine,
    hasValidIncome,
    monthlyIncomeUsd,
    numericIncome,
    paymentMethod,
    result.simpleEligible,
  ]);

  const verdictAmount = formatCop(Math.abs(result.totalSavingsCop));
  const verdictCopy = result.simpleEligible
    ? result.totalSavingsCop >= 0
      ? `Si te pasas al Régimen SIMPLE, podrías liberar ${verdictAmount} COP al año entre impuestos y seguridad social.`
      : `En este caso, el SIMPLE podría costarte ${verdictAmount} COP más al año. Vale la pena revisar deducciones antes de moverte.`
    : `Con este ingreso superas el tope de ${FISCAL_RULES_2026.simpleProfessionalCapUvt.toLocaleString(
        "es-CO",
      )} UVT para el perfil profesional asumido.`;

  return (
    <main className="min-h-screen bg-[#f7f8f3] text-[#17201a]">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
        <div className="flex flex-col justify-between gap-8 rounded-[8px] border border-[#d9dfd2] bg-[#fffdf8] p-5 shadow-sm sm:p-7">
          <div className="space-y-7">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#687363]">
                Simulador tributario express
              </p>
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-[#111813] sm:text-5xl">
                Compara Ordinario vs. SIMPLE en 90 segundos
              </h1>
              <p className="max-w-xl text-base leading-7 text-[#596258]">
                Hecho para freelancers colombianos que facturan servicios
                profesionales al exterior y quieren una primera señal clara antes
                de hablar con un contador.
              </p>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#2d382f]">
                  Ingreso mensual promedio
                </span>
                <div className="flex h-14 items-center rounded-[8px] border border-[#cfd7c8] bg-white px-4 focus-within:border-[#225e4b]">
                  <span className="mr-2 text-sm font-semibold text-[#667061]">
                    USD
                  </span>
                  <input
                    className="h-full min-w-0 flex-1 bg-transparent text-2xl font-semibold outline-none"
                    inputMode="decimal"
                    min="0"
                    type="number"
                    value={monthlyIncomeUsd}
                    onChange={(event) => {
                      setMonthlyIncomeUsd(event.target.value);
                    }}
                  />
                </div>
              </label>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-[#2d382f]">
                  Cómo recibes el dinero
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {paymentMethods.map((method) => (
                    <button
                      className={`h-11 rounded-[8px] border text-sm font-semibold transition ${
                        paymentMethod === method.value
                          ? "border-[#225e4b] bg-[#225e4b] text-white"
                          : "border-[#cfd7c8] bg-white text-[#485346] hover:border-[#7f8c79]"
                      }`}
                      key={method.value}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(method.value);
                      }}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-3 sm:grid-cols-2">
                <ToggleCard
                  checked={hasPrepaidMedicine}
                  label="Pago medicina prepagada"
                  onChange={() => {
                    setHasPrepaidMedicine((value) => !value);
                  }}
                />
                <ToggleCard
                  checked={hasDependents}
                  label="Tengo dependientes"
                  onChange={() => {
                    setHasDependents((value) => !value);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[8px] border border-[#d9dfd2] bg-[#f4f1e8] p-4 text-sm leading-6 text-[#596258]">
            Esto es una simulación para orientarte. No reemplaza una revisión
            contable, no genera formularios DIAN y no guarda tus datos.
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <section className="rounded-[8px] border border-[#ccd7d2] bg-[#12372f] p-5 text-white shadow-sm sm:p-7">
            <div className="grid gap-4 sm:grid-cols-3">
              <Metric
                label="Ingreso anual"
                value={hasValidIncome ? formatCop(result.annualIncomeCop) : "$0"}
                help="Tu ingreso mensual multiplicado por 12 y convertido a pesos con una TRM fija para esta simulación."
              />
              <Metric
                label="Equivalente UVT"
                value={
                  hasValidIncome
                    ? `${formatNumber(result.annualIncomeUvt, 0)} UVT`
                    : "0 UVT"
                }
                help="UVT: una unidad oficial de la DIAN. La usamos para aplicar topes y tablas sin mostrarte toda la norma."
              />
              <Metric
                label="IBC estimado"
                value={hasValidIncome ? formatCop(result.ibcCop) : "$0"}
                help="IBC: no es todo tu ingreso; para independientes suele estimarse sobre el 40%."
              />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <ScenarioCard
              eyebrow="Escenario A"
              label="Régimen Ordinario"
              tax={result.ordinary.annualTaxCop}
              security={result.ordinary.annualSocialSecurityCop}
              taxable={result.ordinary.taxableIncomeCop}
              note={result.ordinary.taxRateLabel}
              description="La ruta tradicional para declarar renta como independiente."
            />
            <ScenarioCard
              eyebrow="Escenario B"
              label="Régimen SIMPLE"
              tax={result.simple.annualTaxCop}
              security={result.simple.annualSocialSecurityCop}
              taxable={result.simple.taxableIncomeCop}
              note={result.simple.taxRateLabel}
              warning={!result.simpleEligible && hasValidIncome}
              description="Una ruta tributaria alternativa. No todos califican, por eso validamos el tope."
            />
          </section>

          <section className="rounded-[8px] border border-[#d4d9cf] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#687363]">
                  Veredicto
                </p>
                <h2 className="max-w-2xl text-3xl font-semibold leading-tight text-[#17201a]">
                  {hasValidIncome
                    ? verdictCopy
                    : "Ingresa tu ingreso mensual para ver la comparación."}
                </h2>
                {hasValidIncome && result.simpleEligible ? (
                  <p className="text-base text-[#596258]">
                    Dejarías de pagar {formatCop(result.taxSavingsCop)} COP en
                    impuestos al año y ahorrarías{" "}
                    {formatCop(result.socialSecuritySavingsCop)} COP en
                    seguridad social, bajo los supuestos del MVP.
                  </p>
                ) : null}
              </div>
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-[8px] bg-[#d4ff5f] px-5 text-center text-sm font-bold text-[#17201a] transition hover:bg-[#c5f24f]"
                href={ctaHref}
                onClick={(event) => {
                  if (ctaHref === "#") {
                    event.preventDefault();
                  }

                  trackEvent("cta_clicked", {
                    payment_method: paymentMethod,
                    monthly_income_usd: numericIncome || 0,
                    simple_eligible: result.simpleEligible,
                    total_savings_cop: Math.round(result.totalSavingsCop),
                  });
                }}
              >
                Quiero que me ayuden a pasarme al Régimen SIMPLE / optimizar mi
                declaración de este año
              </a>
            </div>
          </section>

          <section className="rounded-[8px] border border-[#d9dfd2] bg-[#fffdf8] p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#687363]">
              Supuestos transparentes
            </h2>
            <div className="grid gap-2 text-sm leading-6 text-[#596258] sm:grid-cols-2">
              <InfoNote>
                Usamos una TRM fija de{" "}
                {formatCop(FISCAL_RULES_2026.usdToCop)} por dólar para que la
                comparación sea fácil de leer.
              </InfoNote>
              <InfoNote>
                La UVT 2026 usada en el cálculo es{" "}
                {formatCop(FISCAL_RULES_2026.uvtCop)}.
              </InfoNote>
              <InfoNote>
                Asumimos un perfil freelancer de servicios profesionales,
                consultoría o actividad intelectual.
              </InfoNote>
              <InfoNote>
                Seguridad social se estima sobre IBC del 40%: salud 12.5% y
                pensión 16%.
              </InfoNote>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function ToggleCard({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      className={`flex min-h-14 items-center justify-between rounded-[8px] border px-4 text-left text-sm font-semibold transition ${
        checked
          ? "border-[#225e4b] bg-[#ecf7ed] text-[#17201a]"
          : "border-[#cfd7c8] bg-white text-[#485346] hover:border-[#7f8c79]"
      }`}
      type="button"
      onClick={onChange}
    >
      <span>{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-[#225e4b]" : "bg-[#c8d0c2]"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

function Metric({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help: string;
}) {
  return (
    <div className="rounded-[8px] border border-white/15 bg-white/8 p-4">
      <p className="text-sm text-white/70">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-3 text-sm leading-5 text-white/65">{help}</p>
    </div>
  );
}

function ScenarioCard({
  eyebrow,
  label,
  tax,
  security,
  taxable,
  note,
  description,
  warning = false,
}: {
  eyebrow: string;
  label: string;
  tax: number;
  security: number;
  taxable: number;
  note: string;
  description: string;
  warning?: boolean;
}) {
  return (
    <article className="rounded-[8px] border border-[#d9dfd2] bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#687363]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-[#17201a]">{label}</h2>
      <HelpText>{description}</HelpText>
      <div className="mt-5 space-y-4">
        <Row
          help="Estimación del impuesto de renta o SIMPLE que pagarías en el año."
          label="Impuesto anual"
          value={warning ? "No elegible" : formatCop(tax)}
        />
        <Row
          help="Estimación de salud y pensión. No es una liquidación oficial."
          label="Seguridad social"
          value={formatCop(security)}
        />
        <Row
          help="Monto sobre el que calculamos el impuesto en este escenario."
          label="Base estimada"
          value={formatCop(taxable)}
        />
      </div>
      <p
        className={`mt-5 rounded-[8px] p-3 text-sm leading-6 ${
          warning
            ? "bg-[#fff1d6] text-[#6f4b12]"
            : "bg-[#eef4ec] text-[#485346]"
        }`}
      >
        {warning
          ? "El ingreso anual supera el umbral SIMPLE para servicios profesionales."
          : note}
      </p>
    </article>
  );
}

function Row({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help: string;
}) {
  return (
    <div className="grid gap-1 border-b border-[#edf0e8] pb-3 last:border-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:gap-4">
      <span className="text-sm text-[#596258]">{label}</span>
      <span className="text-right text-base font-semibold text-[#17201a]">
        {value}
      </span>
      <span className="text-sm leading-5 text-[#7a8475] sm:col-span-2">
        {help}
      </span>
    </div>
  );
}

function HelpText({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm leading-5 text-[#687363]">{children}</p>;
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[8px] border border-[#e0e5dc] bg-white/70 p-3">
      {children}
    </p>
  );
}

function formatCop(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits,
  }).format(value);
}
