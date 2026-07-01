import json, urllib.request
from datetime import datetime, timezone, timedelta
from collections import Counter

SUPABASE_URL = "https://lajgymzabpvmavogckns.supabase.co"
APIKEY = "sb_publishable_B32TZ8XeIcnzk0gJNrrGoQ_G2fcnjk4"

req = urllib.request.Request(
    f"{SUPABASE_URL}/rest/v1/leads?select=*&order=created_at.desc",
    headers={"apikey": APIKEY},
)
data = json.loads(urllib.request.urlopen(req).read())

now = datetime.now(timezone.utc)


def safe(val, key, default="—"):
    v = val.get(key)
    if not v:
        return default
    if isinstance(v, str) and len(v) >= 10:
        return v[:10]
    return str(v)[:10]


calientes = [l for l in data if l.get("temperature") == "caliente"]
tibios = [l for l in data if l.get("temperature") == "tibio"]
frios = [l for l in data if l.get("temperature") == "frio"]
presupuesto = [l for l in data if l.get("stage") == "presupuesto_enviado"]
cerrados = [l for l in data if l.get("stage") == "cerrado_perdido"]
conversacion = [
    l
    for l in data
    if l.get("stage") == "conversacion_iniciada"
    and l.get("temperature") not in ("frio", "caliente")
]

print("\n" + "=" * 70)
print("REVISIÓN SEMANAL DE PIPELINE — A7 ARQUITECTURA")
print(f"Fecha: {now.strftime('%d/%m/%Y %H:%M')}")
print("=" * 70)

print(f"\n🟢 CALIENTES ({len(calientes)})")
for l in calientes:
    print(
        f"  {l['full_name']:25s} | {safe(l, 'created_at')} | Próx: {safe(l, 'next_action_date')} | {l.get('next_action_text', '')[:30]}"
    )

print(f"\n🟡 PRESUPUESTO ({len(presupuesto)})")
for l in presupuesto:
    print(f"  {l['full_name']:25s} | {safe(l, 'created_at')}")

print(f"\n🔵 CONVERSACIÓN ({len(conversacion)})")


def parse_dt(s):
    try:
        return datetime.fromisoformat(s)
    except:
        try:
            return datetime.strptime(s.split(".")[0], "%Y-%m-%dT%H:%M:%S").replace(
                tzinfo=timezone.utc
            )
        except:
            return now


for l in sorted(conversacion, key=lambda x: x.get("created_at", "")):
    c = l.get("created_at")
    days = (now - parse_dt(c)).days if c else 0
    flag = " ⚠️" if days >= 7 else ""
    print(
        f"  {l['full_name']:25s} | {days:2d} días | Próx: {safe(l, 'next_action_date')}{flag}"
    )

print(f"\n⚪ FRÍOS ({len(frios)})")
for l in frios:
    print(
        f"  {l['full_name']:25s} | {safe(l, 'created_at')} | {l.get('discard_reason', '')[:40]}"
    )

print(f"\n🔴 CERRADOS ({len(cerrados)})")
for l in cerrados:
    print(f"  {l['full_name']:25s} | {l.get('discard_reason', '—')[:40]}")

print("\n" + "=" * 70)
print("ACCIONES REQUERIDAS")
print("=" * 70)

for l in data:
    if l.get("stage") == "conversacion_iniciada":
        c = l.get("created_at")
        days = (now - parse_dt(c)).days if c else 0
        if days >= 7 and l.get("temperature") != "frio":
            print(f"  ⚠️ {l['full_name']:25s} | {days} días sin avance → ¿pasar a frío?")
    nd = l.get("next_action_date")
    if nd:
        try:
            nd_dt = parse_dt(nd)
            if nd_dt <= now:
                print(
                    f"  🔔 {l['full_name']:25s} | ACCIÓN VENCE HOY: {l.get('next_action_text', '')[:40]}"
                )
        except:
            pass

# Stats
print("\n" + "=" * 70)
print("ESTADÍSTICAS RÁPIDAS")
print("=" * 70)
print(f"  Total leads activos: {len(calientes) + len(presupuesto) + len(conversacion)}")
print(f"  Leads en seguimiento pasivo (fríos+cerrados): {len(frios) + len(cerrados)}")
print(
    f"  Leads sin próxima acción agendada: {sum(1 for l in data if not l.get('next_action_date') and l.get('stage') not in ('cerrado_perdido'))}"
)

ad_counts = Counter(
    l.get("ad_name") or "sin_ad" for l in data if l.get("source") == "meta_ads"
)
print(
    f"  Anuncio con más leads: {ad_counts.most_common(1)[0][0] if ad_counts else 'N/A'} ({ad_counts.most_common(1)[0][1] if ad_counts else 0})"
)
