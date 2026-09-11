#!/usr/bin/env python3
"""Baut die Review-Inventar-Matrix: Kompetenz -> Module -> Lessons -> Placements/Cases -> Viz.

Schreibt docs/content-review/inventar.json und inventar.md.
Nur lesend auf content/. Ausfuehren aus Repo-Root: python3 docs/content-review/build_inventar.py
"""
import json
import glob
import os
import re
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONTENT = os.path.join(ROOT, "content")
OUT = os.path.join(ROOT, "docs", "content-review")


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def case_type(case):
    if "choices" in case:
        return "choice"
    exp = case.get("expected")
    if isinstance(exp, dict):
        return exp.get("kind", "?")
    if exp is not None:
        return type(exp).__name__
    return "?"


def main():
    comps = load(os.path.join(CONTENT, "competencies", "core.json"))["competencies"]
    tracks = load(os.path.join(CONTENT, "tracks", "core.json"))["tracks"]
    milestones = load(os.path.join(CONTENT, "milestones", "core.json"))
    milestone_list = milestones.get("milestones", milestones if isinstance(milestones, list) else [])
    coverage = {c["competencyId"]: c for c in load(os.path.join(CONTENT, "competency-family-coverage.json"))["coverage"]}

    modules = {}
    for p in glob.glob(os.path.join(CONTENT, "modules", "*.json")):
        d = load(p)
        modules[d["moduleId"]] = d

    lessons = {}
    for p in glob.glob(os.path.join(CONTENT, "lessons", "*", "*.json")):
        if p.endswith(".viz.json"):
            continue
        d = load(p)
        lessons[d["lessonId"]] = (d, p)

    families = {}
    for p in glob.glob(os.path.join(CONTENT, "families", "*.json")):
        d = load(p)
        families[d["familyId"]] = (d, p)

    banks = {os.path.basename(p)[:-5]: load(p) for p in glob.glob(os.path.join(CONTENT, "banks", "*.json"))}

    explanations = []
    for p in glob.glob(os.path.join(CONTENT, "explanations", "*", "*.json")):
        explanations.append((load(p), p))

    projects = {}
    for p in glob.glob(os.path.join(CONTENT, "projects", "*", "*.json")):
        d = load(p)
        pid = d.get("projectId", os.path.basename(os.path.dirname(p)))
        projects[pid] = (d, p)

    comp_to_tracks = defaultdict(list)
    for t in tracks:
        for cid in t.get("competencyIds", []):
            comp_to_tracks[cid].append(t["trackId"])

    comp_to_explanations = defaultdict(list)
    for ex, p in explanations:
        for cid in ex.get("competencyIds", []):
            comp_to_explanations[cid].append(ex["explanationId"])

    inventar = {"competencies": [], "unplacedFamilies": [], "tracklessCompetencies": []}
    used_families = set()

    for c in comps:
        cid = c["competencyId"]
        entry = {
            "competencyId": cid,
            "title": c["title"],
            "domain": c.get("domain"),
            "level": c.get("level"),
            "requires": c.get("requires", []),
            "relations": c.get("relations", []),
            "trackIds": sorted(set(c.get("trackIds", []) + comp_to_tracks.get(cid, []))),
            "estimatedMinutes": c.get("estimatedMinutes"),
            "releaseStatus": c.get("releaseStatus"),
            "description": c.get("description"),
            "modules": [],
            "explanationCards": comp_to_explanations.get(cid, []),
        }
        for m in modules.values():
            if cid not in m.get("competencyIds", []):
                continue
            mentry = {
                "moduleId": m["moduleId"],
                "title": m["title"],
                "requires": m.get("requires", []),
                "lessons": [],
                "placements": [],
                "projectIds": m.get("projectIds", []),
            }
            for lid in m.get("lessonIds", []):
                hit = lessons.get(lid)
                if not hit:
                    mentry["lessons"].append({"lessonId": lid, "missing": True})
                    continue
                ld, lp = hit
                blocks = ld.get("blocks", [])
                lentry = {
                    "lessonId": lid,
                    "path": os.path.relpath(lp, ROOT),
                    "title": ld.get("title"),
                    "objectives": ld.get("objectives", []),
                    "estimatedMinutes": ld.get("estimatedMinutes"),
                    "releaseStatus": ld.get("releaseStatus"),
                    "blockTypes": [b.get("type") for b in blocks],
                    "vizRefs": [b.get("contentRef") for b in blocks if b.get("type") == "visualization"],
                    "mdFiles": [],
                }
                for b in blocks:
                    ref = b.get("contentRef", "")
                    if ref.endswith(".md"):
                        mdp = os.path.join(CONTENT, ref)
                        if os.path.exists(mdp):
                            text = open(mdp, encoding="utf-8").read()
                            lentry["mdFiles"].append({
                                "ref": ref,
                                "lines": text.count("\n") + 1,
                                "words": len(re.findall(r"\S+", text)),
                                "block": b.get("type"),
                            })
                mentry["lessons"].append(lentry)
            for pl in m.get("placements", []):
                fid = pl.get("familyId")
                used_families.add(fid)
                fentry = {
                    "placementId": pl.get("placementId"),
                    "familyId": fid,
                    "caseId": pl.get("caseId"),
                    "role": pl.get("role"),
                    "difficulty": pl.get("difficulty"),
                    "masteryEligible": pl.get("masteryEligible"),
                    "estimatedMinutes": pl.get("estimatedMinutes"),
                    "lessonId": pl.get("lessonId"),
                }
                fhit = families.get(fid)
                if fhit:
                    fd, _ = fhit
                    fentry["familyProcedural"] = bool(fd.get("contract"))
                    fentry["familyCaseCount"] = len(fd.get("cases", []))
                    fentry["familyHasBank"] = fid in banks
                    if pl.get("caseId"):
                        case = next((x for x in fd.get("cases", []) if x.get("caseId") == pl["caseId"]), None)
                        if case:
                            fentry["caseType"] = case_type(case)
                            fentry["caseHasFeedbackRules"] = bool(case.get("feedbackRules"))
                            fentry["caseHintCount"] = len(case.get("hints", []))
                            fentry["caseHasWorkedExample"] = bool(case.get("workedExample"))
                        else:
                            fentry["caseMissing"] = True
                mentry["placements"].append(fentry)
            entry["modules"].append(mentry)
        pol = c.get("evidencePolicy", {})
        mastery_defs = {
            f'{p["familyId"]}:{p["caseId"]}'
            for m in entry["modules"] for p in m["placements"]
            if p.get("masteryEligible") and p.get("caseId")
        }
        entry["policyCheck"] = {
            "minimumDistinctDefinitions": pol.get("minimumDistinctDefinitions"),
            "minimumIndependentHits": pol.get("minimumIndependentHits"),
            "delayedHitRequired": pol.get("delayedHitRequired"),
            "freshnessDays": pol.get("freshnessDays"),
            "masteryEligibleDefinitions": len(mastery_defs),
            "policySatisfiable": len(mastery_defs) >= (pol.get("minimumDistinctDefinitions") or 0),
        }
        inventar["competencies"].append(entry)

    placed = set()
    for m in modules.values():
        for pl in m.get("placements", []):
            if pl.get("familyId"):
                placed.add(pl["familyId"])
    inventar["unplacedFamilies"] = sorted(fid for fid in families if fid not in placed)
    inventar["tracklessCompetencies"] = sorted(c["competencyId"] for c in inventar["competencies"] if not c["trackIds"])

    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "inventar.json"), "w", encoding="utf-8") as f:
        json.dump(inventar, f, indent=1, ensure_ascii=False)

    # Markdown summary
    lines = ["# Content-Review Inventar", "", "Generiert via build_inventar.py. Pro Kompetenz: Module, Lessons, Placements, Viz, Status.", ""]
    by_dom = defaultdict(list)
    for e in inventar["competencies"]:
        by_dom[e["domain"]].append(e)
    for dom in sorted(by_dom):
        lines.append(f"## {dom} ({len(by_dom[dom])})")
        lines.append("")
        lines.append("| Kompetenz | Status | Module | Lessons | Placements | mastery-Defs (Bedarf) | Viz | Minuten |")
        lines.append("|---|---|---|---|---|---|---|---|")
        for e in by_dom[dom]:
            nmod = len(e["modules"])
            nles = sum(len(m["lessons"]) for m in e["modules"])
            npl = sum(len(m["placements"]) for m in e["modules"])
            chk = e["policyCheck"]
            defs = f"{chk['masteryEligibleDefinitions']} ({chk['minimumDistinctDefinitions']})"
            if not chk["policySatisfiable"]:
                defs += " VERLETZT"
            nviz = sum(len(l["vizRefs"]) for m in e["modules"] for l in m["lessons"])
            lines.append(f"| `{e['competencyId']}` {e['title']} | {e['releaseStatus']} | {nmod} | {nles} | {npl} | {defs} | {nviz} | {e['estimatedMinutes']} |")
        lines.append("")
    lines.append(f"Unplatzierte Familien ({len(inventar['unplacedFamilies'])}): {', '.join(inventar['unplacedFamilies'])}")
    lines.append("")
    lines.append(f"Kompetenzen ohne Track ({len(inventar['tracklessCompetencies'])}): {', '.join(inventar['tracklessCompetencies'])}")
    with open(os.path.join(OUT, "inventar.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"competencies={len(inventar['competencies'])} modules={len(modules)} lessons={len(lessons)} "
          f"families={len(families)} banks={len(banks)} unplaced={len(inventar['unplacedFamilies'])} "
          f"trackless={len(inventar['tracklessCompetencies'])}")


if __name__ == "__main__":
    main()
