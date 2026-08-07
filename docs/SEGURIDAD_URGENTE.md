# Clave de Supabase expuesta — qué hacer y en qué orden

Encontrado el 2026-08-07 mientras se contestaba una pregunta sobre servidores.

---

## Qué pasa

En `docs/PEPTIDEX_Facturador.html`, línea 1446, el campo se llama `anonKey`
pero el valor que lleva **empieza por `sb_secret_`**.

Ésa no es la clave pública. Es la **clave de servicio** de Supabase, y su
propiedad es que **se salta todas las reglas de seguridad por fila**. Quien la
tenga puede leer, modificar y borrar cualquier tabla del proyecto, sin
restricción y sin dejar rastro de quién fue.

Y está en un repositorio **público** de GitHub, en un fichero que además se
sirve por GitHub Pages.

Junto a ella está `pin:'PX-CHEEMS-2026'`, que es lo único que protege las
funciones de pedidos. También está a la vista.

## Lo primero, y es lo único que corre prisa

**Rota la clave. Ahora, antes de tocar el código.**

1. Entra a `supabase.com` → tu proyecto → **Settings → API Keys**
2. Busca la clave secreta (`sb_secret_…`) y dale a **revocar** o **rotar**
3. Copia la **publicable** (`sb_publishable_…`), que es la que sí puede ir en
   un fichero que abre el navegador

**Cambiar el código no sirve de nada hasta que hagas esto.** La clave ya está
en el histórico de git, en GitHub y probablemente en algún rastreador
automático — esos escanean repositorios públicos buscando exactamente este
patrón, y suelen encontrarlo en minutos. Borrarla del fichero no la borra de
donde ya está.

Mientras la clave siga viva, la base de datos está abierta.

## Lo segundo: mira si alguien entró

En Supabase, **Logs → API**. Busca peticiones que no reconozcas: horas raras,
direcciones que no sean tuyas, borrados que no hiciste.

Si ves algo, avísame y lo miramos juntos.

## Lo tercero: el PIN

`PX-CHEEMS-2026` está en el mismo fichero público. Con él, cualquiera puede
llamar a `admin_list_orders`, `admin_save_order` y `admin_delete_order`.

Cámbialo por otro, pero que quede claro: **un PIN dentro de un fichero que abre
el navegador nunca es un secreto.** Es una cerradura con la llave pegada en la
puerta. Aguanta contra el curioso y no contra nadie más.

La solución de verdad es Supabase Auth: que el facturador pida usuario y
contraseña de verdad, y que las reglas por fila comprueben quién eres del lado
del servidor. Es el mismo trabajo que hace falta para las cuentas de PepX, así
que se hace una vez y sirve para las dos cosas.

## Lo cuarto: el código

Sólo hay **un** sitio que use la clave secreta — la lectura directa de la tabla
`quotes` en `cloudPull()`, línea 1451. Todo lo demás ya usa la publicable a
través de `ordHeaders()`.

O sea: el arreglo es pequeño. Se cambia esa lectura por una función del lado
del servidor, igual que ya se hizo con los pedidos.

```sql
-- correr en Supabase → SQL Editor, DESPUÉS de rotar la clave
create or replace function public.admin_list_quotes(p_pin text)
returns table (payload jsonb, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- el PIN vive aquí, en el servidor, no en el navegador
  if p_pin is distinct from current_setting('app.admin_pin', true) then
    raise exception 'no autorizado';
  end if;
  return query
    select q.payload, q.created_at
    from public.quotes q
    order by q.created_at desc
    limit 500;
end;
$$;

revoke all on function public.admin_list_quotes(text) from anon, authenticated;
grant execute on function public.admin_list_quotes(text) to anon;
```

Y el PIN se guarda como ajuste de la base de datos, no en el SQL:

```sql
alter database postgres set app.admin_pin = 'EL-PIN-NUEVO';
```

Con eso, `cloudPull()` pasa a llamar a `admin_list_quotes` con `ordHeaders()`
—la clave publicable— y la clave secreta desaparece del documento.

## Cómo evitar que vuelva a pasar

Una clave secreta **nunca** va en un fichero que abre el navegador. Da igual
cómo se llame la variable.

La regla corta: si el fichero lo puede abrir un cliente, sólo puede llevar
claves publicables. Todo lo demás va en el servidor — en una función de
Supabase o en una función de Netlify, donde la clave es una variable de
entorno.

---

*Esto no es una auditoría de seguridad completa. Es un hallazgo concreto,
encontrado de casualidad. Si quieres que revise el resto con calma, dilo.*
