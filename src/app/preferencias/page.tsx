import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MutationForm } from "@/components/mutation-form";
import { preferenceAction } from "../actions";
export default async function Preferences() {
  const user = await requireUser();
  const pref = await db.preference.findUnique({ where: { userId: user.id } });
  return (
    <section className="shell narrow section">
      <span className="eyebrow">UN RADAR A TU MEDIDA</span>
      <h1>¿Qué quieres aprender?</h1>
      <p>
        Tus intereses ayudan a ordenar las oportunidades de cada página. Usamos
        coincidencias de texto explicables, sin IA generativa.
      </p>
      <MutationForm
        action={preferenceAction}
        className="panel plan-form"
        label="Guardar preferencias"
      >
        <label>
          Lenguajes
          <input
            name="languages"
            defaultValue={pref?.languages.join(", ")}
            placeholder="TypeScript, Python, Go"
            maxLength={600}
          />
        </label>
        <label>
          Tecnologías
          <input
            name="technologies"
            defaultValue={pref?.technologies.join(", ")}
            placeholder="React, PostgreSQL, Docker"
            maxLength={600}
          />
        </label>
        <label>
          Intereses
          <input
            name="interests"
            defaultValue={pref?.interests.join(", ")}
            placeholder="Accesibilidad, documentación, testing"
            maxLength={600}
          />
        </label>
        <p className="muted">
          Separa los valores con comas. Hasta 15 elementos por campo, 40
          caracteres por elemento.
        </p>
      </MutationForm>
    </section>
  );
}
