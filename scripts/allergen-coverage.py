# Which food-producing routes see the household's allergies?
#
# Menu generation always excluded restricted ingredients when choosing meal
# NAMES, but the functions that wrote the actual ingredient list, substituted an
# ingredient, simplified a recipe or rewrote one around a removal never saw
# them. A safe name is not a safe recipe — the allergen enters at the ingredient
# line.
#
# Run: python3 scripts/allergen-coverage.py
#
# EXPECTED EXEMPTIONS — these transform text the household already has, or do
# not choose ingredients, so they carry no allergen risk:
#   converter, translate, translate-recipe, translate-ui  — unit/language only
#   parse-recipe, recipes/parse-text, heritage/scan       — parse the user's OWN recipe
#   menu/grocery-list, special-occasion/[id]/groceries    — list what is already chosen
#   special-occasion/[id]/reschedule                      — moves timing, not food
#   traditions/suggestions                                — names festivals, not dishes
#
# Anything else appearing as "NO RESTRICTIONS" is a bug.

import os, re, json

ROOT="app/api"
# Routes that can put food in front of a household.
FOOD_ROUTES=[]
for dp,_,fns in os.walk(ROOT):
    if "route.ts" not in fns: continue
    p=os.path.join(dp,"route.ts")
    src=open(p).read()
    if not re.search(r"anthropicClient|from '@/lib/claude'", src): continue
    if "/admin/" in p: continue
    FOOD_ROUTES.append((p,src))

def calls(src):
    return set(re.findall(r"(?:await\s+)?([a-zA-Z][a-zA-Z0-9_]*)\s*\(", src))

# which lib/claude.ts functions embed restrictions in their own prompt
claude=open("lib/claude.ts").read()
fns={}
for m in re.finditer(r"export async function (\w+)\(", claude):
    name=m.group(1); start=m.start()
    nxt=claude.find("\nexport ", start+10)
    body=claude[start: nxt if nxt>0 else len(claude)]
    fns[name] = bool(re.search(r"restrictions", body))

rows=[]
for p,src in FOOD_ROUTES:
    name=p.replace("app/api/","").replace("/route.ts","")
    fetches = bool(re.search(r"getSettings\(", src))
    # restrictions referenced directly in the route
    direct = bool(re.search(r"restrictions", src))
    # or delegated to a lib/claude fn that handles them
    used=[f for f in calls(src) if f in fns]
    via=[f for f in used if fns[f]]
    covered = direct or bool(via)
    rows.append((name, fetches, direct, via, covered))

rows.sort(key=lambda r: (r[4], r[0]))
print(f"{'route':42} {'getSettings':11} {'restrictions':12} {'via lib fn':22} verdict")
print("-"*104)
for name,fetches,direct,via,covered in rows:
    print(f"{name:42} {'yes' if fetches else 'NO':11} {'yes' if direct else 'no':12} {(','.join(via) or '-')[:22]:22} {'ok' if covered else '*** NO RESTRICTIONS ***'}")
print()
gaps=[r for r in rows if not r[4]]
print(f"{len(gaps)} of {len(rows)} food-producing routes never see the household's restrictions.")
