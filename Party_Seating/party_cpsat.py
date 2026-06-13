"""
Party Table Optimization — EXACT (CP-SAT).
Run locally:  pip install ortools  &&  python3 party_cpsat.py
Web UI:       python3 server.py  →  http://localhost:8765/party_seating.html

Model (all soft except capacity + must-sit-together):
  minimize  W_FOOD * Σ_tables (spice_spread + sweet_spread + portion_spread)
          + W_CONF * Σ_conflict (severity × same_table)
          + W_VIP  * (extra tables VIPs are split across)
  s.t.      each node -> exactly 1 table
            Σ node_size at table <= CAP
            each used table has >= MIN_TABLE seats (MIN_TABLE = CAP // 2)
"""
import argparse
import json
import os
import random
import secrets
import statistics
import time
from collections import defaultdict
from pathlib import Path

from ortools.sat.python import cp_model

OUT_JS = Path(__file__).with_name("seating_data.js")
SCALE = 10
GROUP_PATTERN = [2, 2, 3, 4, 5, 2]
SPICE_HI = SWEET_HI = 5 * SCALE

DEFAULTS = {
    "N": 56,
    "N_TABLES": 10,
    "CAP": 6,
    "W_FOOD": 50,
    "W_CONF": 100,
    "W_VIP": 200,
}

MAX_N = 300


def solver_max_seconds():
    raw = os.environ.get("SOLVER_MAX_SECONDS", "60")
    try:
        val = float(raw)
    except ValueError:
        val = 60.0
    return max(1.0, min(val, 300.0))


def sample_conflict_pairs(node_ids, k):
    nodes = list(node_ids)
    if len(nodes) < 2 or k <= 0:
        return []
    pairs, seen = [], set()
    attempts, limit = 0, max(k * 30, 100)
    while len(pairs) < k and attempts < limit:
        a, b = random.sample(nodes, 2)
        if a > b:
            a, b = b, a
        if (a, b) not in seen:
            seen.add((a, b))
            pairs.append((a, b, random.randint(1, 5)))
        attempts += 1
    return pairs


def solve(params=None, *, seed=None, write_js=True, verbose=True):
    raw = dict(params or {})
    if seed is None and "seed" in raw:
        s = raw.pop("seed")
        if s is not None and s != "":
            seed = int(s)
    p = {**DEFAULTS, **raw}
    n = int(p["N"])
    n_tables = int(p["N_TABLES"])
    cap = int(p["CAP"])
    w_food = int(p["W_FOOD"])
    w_conf = int(p["W_CONF"])
    w_vip = int(p["W_VIP"])
    min_table = cap // 2
    min_individuals = round(n * 0.15)

    if n < 1 or n_tables < 1 or cap < 2:
        raise ValueError("N and N_TABLES must be ≥ 1; CAP must be ≥ 2")
    if n > MAX_N:
        raise ValueError(f"N must be ≤ {MAX_N}")

    seed = secrets.randbits(32) if seed is None else int(seed)
    random.seed(seed)
    if verbose:
        print(f"random seed: {seed}\n")

    people = {
        i: {
            "spice": random.randint(1, 5),
            "sweet": random.randint(1, 5),
            "portion": random.randint(1, 5),
            "vip": False,
        }
        for i in range(n)
    }

    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        parent[find(a)] = find(b)

    ids = list(range(n))
    random.shuffle(ids)
    reserved_singles = set(ids[:min_individuals])
    groupable = [i for i in ids if i not in reserved_singles]
    random.shuffle(groupable)
    idx = pi = 0
    while idx < len(groupable):
        size = GROUP_PATTERN[pi % len(GROUP_PATTERN)]
        if idx + size > len(groupable):
            break
        grp = groupable[idx : idx + size]
        for a, b in zip(grp, grp[1:]):
            union(a, b)
        idx += size
        pi += 1

    groups = defaultdict(list)
    for person in range(n):
        groups[find(person)].append(person)
    groups = list(groups.values())
    n_individuals = sum(1 for g in groups if len(g) == 1)
    if verbose:
        print(f"individuals: {n_individuals} (min {min_individuals})\n")

    max_vips = round(n * 0.20)
    for person in random.sample(range(n), random.randint(1, max(1, max_vips))):
        people[person]["vip"] = True

    nodes = [
        {
            "members": g,
            "size": len(g),
            "spice": round(SCALE * statistics.mean(people[p]["spice"] for p in g)),
            "sweet": round(SCALE * statistics.mean(people[p]["sweet"] for p in g)),
            "portion": sum(people[p]["portion"] for p in g),
            "vip": any(people[p]["vip"] for p in g),
        }
        for g in groups
    ]
    m_nodes = len(nodes)

    stranger_nodes = [i for i, node in enumerate(nodes) if not node["vip"]]
    n_strangers = sum(nodes[i]["size"] for i in stranger_nodes)
    n_conf = max(1, round(2 * n_strangers / 10)) if len(stranger_nodes) >= 2 else 0
    conflicts = sample_conflict_pairs(stranger_nodes, n_conf)
    portion_hi = cap * 5

    model = cp_model.CpModel()
    x = {
        (i, t): model.NewBoolVar(f"x_{i}_{t}")
        for i in range(m_nodes)
        for t in range(n_tables)
    }

    for i in range(m_nodes):
        model.AddExactlyOne(x[i, t] for t in range(n_tables))
    for t in range(n_tables):
        load = sum(nodes[i]["size"] * x[i, t] for i in range(m_nodes))
        model.Add(load <= cap)
        empty = model.NewBoolVar(f"empty_{t}")
        model.Add(load == 0).OnlyEnforceIf(empty)
        model.Add(load >= min_table).OnlyEnforceIf(empty.Not())

    obj = []
    for t in range(n_tables):
        for key, hi in (("spice", SPICE_HI), ("sweet", SWEET_HI), ("portion", portion_hi)):
            mx = model.NewIntVar(0, hi, f"max_{key}_{t}")
            mn = model.NewIntVar(0, hi, f"min_{key}_{t}")
            for i in range(m_nodes):
                val = nodes[i][key]
                model.Add(mx >= val).OnlyEnforceIf(x[i, t])
                model.Add(mn <= val).OnlyEnforceIf(x[i, t])
            spread = model.NewIntVar(0, hi, f"spread_{key}_{t}")
            model.Add(spread == mx - mn)
            obj.append(w_food * spread)

    for k, (a, b, s) in enumerate(conflicts):
        same = model.NewBoolVar(f"same_{k}")
        for t in range(n_tables):
            model.Add(same >= x[a, t] + x[b, t] - 1)
        obj.append(w_conf * s * same)

    vip_nodes = [i for i, node in enumerate(nodes) if node["vip"]]
    used = []
    for t in range(n_tables):
        u = model.NewBoolVar(f"vipused_{t}")
        for i in vip_nodes:
            model.Add(u >= x[i, t])
        used.append(u)
    model.Minimize(sum(obj) + w_vip * (sum(used) - 1))

    solver = cp_model.CpSolver()
    max_sec = solver_max_seconds()
    solver.parameters.num_search_workers = min(8, os.cpu_count() or 1)
    solver.parameters.max_time_in_seconds = max_sec
    t0 = time.perf_counter()
    status = solver.Solve(model)
    solve_time = time.perf_counter() - t0

    if verbose:
        print(
            "status:", solver.StatusName(status),
            "| optimal" if status == cp_model.OPTIMAL else "| feasible",
        )
        print(
            f"objective: {solver.ObjectiveValue():.0f}  "
            f"(nodes={m_nodes}, strangers={n_strangers}, conflicts={n_conf}, "
            f"solve={solve_time:.2f}s)\n"
        )

    seat = defaultdict(list)
    node_table = {}
    for i in range(m_nodes):
        for t in range(n_tables):
            if solver.Value(x[i, t]):
                node_table[i] = t
                seat[t].extend(nodes[i]["members"])

    co_seated = 0
    table_scores = {}
    vip_tables = [t for t in range(n_tables) if seat[t] and any(people[p]["vip"] for p in seat[t])]
    vip_penalty = w_vip * max(0, len(vip_tables) - 1)
    vip_share = vip_penalty // len(vip_tables) if vip_tables else 0

    for t in range(n_tables):
        ppl = sorted(seat[t])
        if not ppl:
            if verbose:
                print(f"Table {t}: (empty)\n")
            continue

        sp = [people[p]["spice"] for p in ppl]
        sw = [people[p]["sweet"] for p in ppl]
        pr = [people[p]["portion"] for p in ppl]
        spice_spread = max(sp) - min(sp)
        sweet_spread = max(sw) - min(sw)
        portion_spread = max(pr) - min(pr)
        food_score = w_food * (spice_spread + sweet_spread + portion_spread)

        conflict_score = 0
        for a, b, s in conflicts:
            if node_table.get(a) == t and node_table.get(b) == t:
                conflict_score += w_conf * s

        has_vip = t in vip_tables
        vip_score = vip_share if has_vip else 0
        total_score = food_score + conflict_score + vip_score

        table_scores[str(t)] = {
            "food": food_score,
            "conflict": conflict_score,
            "vip": vip_score,
            "total": total_score,
            "spiceSpread": spice_spread,
            "sweetSpread": sweet_spread,
            "portionSpread": portion_spread,
        }

        if verbose:
            por = sum(people[p]["portion"] for p in ppl)
            vip = "  <-- VIP" if has_vip else ""
            sc = table_scores[str(t)]
            print(f"Table {t} ({len(ppl)}){vip}  people={ppl}")
            print(
                f"  spice {sp} spread {spice_spread} | "
                f"sweet {sw} spread {sweet_spread} | "
                f"portion {pr} spread {portion_spread}"
            )
            parts = [f"food {sc['food']}", f"conflict {sc['conflict']}"]
            if sc["vip"]:
                parts.append(f"vip {sc['vip']}")
            print(f"  score {sc['total']} ({' · '.join(parts)})")
            print(
                f"  KITCHEN spice~{round(statistics.mean(sp))} "
                f"sweet~{round(statistics.mean(sw))} portion={por}\n"
            )

    viz_conflicts = []
    for a, b, s in conflicts:
        ta, tb = node_table.get(a), node_table.get(b)
        same = ta == tb
        co_seated += same
        viz_conflicts.append({
            "a": sorted(nodes[a]["members"]),
            "b": sorted(nodes[b]["members"]),
            "severity": s,
            "sameTable": same,
            "table": ta if same else None,
        })

    payload = {
        "seed": seed,
        "status": solver.StatusName(status),
        "objective": round(solver.ObjectiveValue()),
        "params": {
            "N": n,
            "N_TABLES": n_tables,
            "CAP": cap,
            "W_FOOD": w_food,
            "W_CONF": w_conf,
            "W_VIP": w_vip,
        },
        "people": {
            p: {
                "s": d["spice"],
                "w": d["sweet"],
                "p": d["portion"],
                **({"vip": True} if d["vip"] else {}),
            }
            for p, d in people.items()
        },
        "groups": [sorted(g) for g in groups],
        "tables": {str(t): sorted(seat[t]) for t in range(n_tables) if seat[t]},
        "tableScores": table_scores,
        "conflicts": viz_conflicts,
        "stats": {
            "nPeople": n,
            "nTables": n_tables,
            "capacity": cap,
            "minTable": min_table,
            "nIndividuals": n_individuals,
            "nFamilyGroups": sum(1 for g in groups if len(g) > 1),
            "nVips": sum(d["vip"] for d in people.values()),
            "nConflicts": len(conflicts),
            "nCoSeated": co_seated,
            "vipPenalty": vip_penalty,
            "solveTime": round(solve_time, 2),
        },
    }

    if write_js:
        OUT_JS.write_text(
            "// Auto-generated by party_cpsat.py — do not edit\n"
            f"window.SEATING_DATA = {json.dumps(payload, separators=(',', ':'))};\n",
            encoding="utf-8",
        )
        if verbose:
            print(f"Wrote {OUT_JS.name} (open party_seating.html to view)")

    return payload


def main():
    ap = argparse.ArgumentParser(description="Party seating CP-SAT optimizer")
    ap.add_argument("--n", type=int, default=DEFAULTS["N"])
    ap.add_argument("--n-tables", type=int, default=DEFAULTS["N_TABLES"])
    ap.add_argument("--cap", type=int, default=DEFAULTS["CAP"])
    ap.add_argument("--w-food", type=int, default=DEFAULTS["W_FOOD"])
    ap.add_argument("--w-conf", type=int, default=DEFAULTS["W_CONF"])
    ap.add_argument("--w-vip", type=int, default=DEFAULTS["W_VIP"])
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()
    solve(
        {
            "N": args.n,
            "N_TABLES": args.n_tables,
            "CAP": args.cap,
            "W_FOOD": args.w_food,
            "W_CONF": args.w_conf,
            "W_VIP": args.w_vip,
        },
        seed=args.seed,
    )


if __name__ == "__main__":
    main()
