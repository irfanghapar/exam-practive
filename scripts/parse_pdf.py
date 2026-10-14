"""Parse an ExamTopics-style PDF dump into the JSON the app uses.

Usage:  python3 scripts/parse_pdf.py <exam.pdf>

Writes  src/data/questions.json        (questions, options, official answer, community votes)
        public/discussions/<chunk>.json (discussion comments, 50 questions per file)

Requires: pip install pymupdf
"""
import json, os, re, sys
from collections import Counter
import pymupdf

SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHUNK = 50

doc = pymupdf.open(SRC)

ICON_USER = ""
ICONS = ""

def clean(s: str) -> str:
    s = s.replace("\xac", "fi").replace("\xad", "fl").replace("\xae", "ffi").replace("\xaf", "ffl").replace("\xa0", " ")
    s = re.sub(r"\bAWS(?=[A-Z][a-z])", "AWS ", s)
    for ch in ICONS:
        s = s.replace(ch, "")
    return s.rstrip()

# Build a flat stream of lines with their block x-position.
lines = []  # (page, x0, text, is_hdr, blockkey, y0)
for pno in range(1, len(doc)):
    page = doc[pno]
    for bi, b in enumerate(page.get_text("blocks", sort=True)):
        if b[6] != 0:
            continue
        x0 = b[0]
        for ln in b[4].split("\n"):
            is_hdr = ln.lstrip("\uf147").startswith("\uf007")
            ln = re.sub(r"[ \t]+", " ", clean(ln))
            if ln.strip() == "":
                continue
            lines.append((pno + 1, x0, ln, is_hdr, (pno, bi), b[2]))

Q_RE = re.compile(r"^(?:Topic\s*\d+\s*)?Question #(\d+)\s*(?:Topic\s*(\d+))?")
OPT_RE = re.compile(r"^([A-F])\.\s+(.*)$")
ANS_RE = re.compile(r"^Correct Answer:\s*([A-F]+)\s*$")
VOTE_TOKEN_RE = re.compile(r"([A-F]+)\s*\((\d+)%\)")
BARE_PCT_RE = re.compile(r"^\s*(\d+%\s*)+$")
HDR_RE = re.compile(
    r"^(?P<user>.+?)\s+(?:(?P<badge>Highly Voted|Most Recent)\s+)?(?P<time>\d+\s+(?:year|month|week|day|hour|minute)s?(?:,\s*\d+\s+(?:year|month|week|day|hour|minute)s?)?\s+ago)\s*$"
)
UPV_RE = re.compile(r"^upvoted (\d+) times?\s*$")
SEL_RE = re.compile(r"^Selected Answer:\s*([A-F]+)\s*$")

questions = []
q = None
state = None  # 'stem', 'opts', 'post', 'comment'
cur_opt = None
comment = None
comment_stack = []  # (x0, comment) for nesting
warnings = []

def finish_comment():
    global comment
    if comment is None:
        return
    comment["body"] = "\n".join(comment["body"]).strip()
    comment.pop("_x", None)
    comment = None

def push_comment(x0, c):
    """Attach comment to question or to parent based on indentation."""
    global comment_stack
    while comment_stack and x0 <= comment_stack[-1][0] + 2:
        comment_stack.pop()
    if comment_stack:
        comment_stack[-1][1]["replies"].append(c)
    else:
        q["comments"].append(c)
    comment_stack.append((x0, c))

i = 0
for page, x0, raw, is_hdr, bkey, x1 in lines:
    text = raw.strip()
    m = Q_RE.match(text)
    if m:
        finish_comment()
        q = {
            "id": int(m.group(1)),
            "topic": int(m.group(2) or 1),
            "page": page,
            "question": [],
            "_stem": [],  # (bkey, y0, text)
            "options": {},
            "answer": None,
            "votes": [],
            "votesOther": 0,
            "comments": [],
        }
        questions.append(q)
        state = "stem"
        cur_opt = None
        comment_stack = []
        continue
    if q is None:
        continue

    # Community vote distribution can appear in any post-answer state
    if state in ("post", "comment", "votes") and text == "Community vote distribution":
        state_before = state
        state = "votes"
        q["_votes_return"] = state_before
        continue
    if state == "votes":
        toks = VOTE_TOKEN_RE.findall(text)
        if toks:
            for letters, pct in toks:
                q["votes"].append({"choice": letters, "pct": int(pct)})
            rest = VOTE_TOKEN_RE.sub("", text)
            for p in re.findall(r"(\d+)%", rest):
                q["votesOther"] += int(p)
            continue
        if BARE_PCT_RE.match(text):
            for p in re.findall(r"(\d+)%", text):
                q["votesOther"] += int(p)
            continue
        if text in ("Other",) or re.fullmatch(r"\(\s*\d*%?\)", text):
            continue
        state = q.pop("_votes_return")
        # fall through to normal handling of this line

    if state == "stem":
        om = OPT_RE.match(text)
        if om:
            state = "opts"
        else:
            q["_stem"].append((bkey, x1, text))
            continue
    if state == "opts":
        om = OPT_RE.match(text)
        am = ANS_RE.match(text)
        if am:
            q["answer"] = am.group(1)
            state = "post"
            cur_opt = None
            continue
        if om:
            cur_opt = om.group(1)
            q["options"][cur_opt] = om.group(2).strip()
        elif cur_opt:
            q["options"][cur_opt] += " " + text
        continue
    if state in ("post", "comment"):
        am = ANS_RE.match(text)
        if am and q["answer"] is None:
            q["answer"] = am.group(1)
            continue
        hm = HDR_RE.match(text)
        # A header line comes from a block starting at the user icon; the icon
        # was stripped, so rely on the regex + a sanity check on length.
        if hm and (is_hdr or state == "post"):
            finish_comment()
            comment = {
                "user": hm.group("user").strip(),
                "badge": hm.group("badge"),
                "time": hm.group("time"),
                "selected": None,
                "body": [],
                "upvotes": 0,
                "replies": [],
                "_x": x0,
            }
            push_comment(x0, comment)
            state = "comment"
            continue
        if state == "comment" and comment is not None:
            um = UPV_RE.match(text)
            if um and x0 - comment["_x"] > 19:
                comment["upvotes"] = int(um.group(1))
                finish_comment()
                state = "post"
                continue
            sm = SEL_RE.match(text)
            if sm and comment["selected"] is None and not comment["body"]:
                comment["selected"] = sm.group(1)
                continue
            comment["body"].append(text)
            continue
        # stray text in post state
        if re.fullmatch(r"Topic\s*\d+", text) or text.startswith("Currently there are no comments") or "Previous Questions" in text or "Next Questions" in text or len(text) <= 1:
            continue
        warnings.append((q["id"], page, text[:80]))

finish_comment()

# Post-process
for q in questions:
    # Lines that reach the right margin (~690pt+) were wrapped by the page
    # width; shorter lines are real line breaks in the source.
    parts = []
    prev = None
    for bkey, x1, text in q["_stem"]:
        if prev is None:
            parts.append(text)
        elif bkey == prev[0] or text.startswith(("(Choose", "two.)", "three.)")):
            parts[-1] += " " + text
        elif prev[2].endswith((".", "?")) and re.match(r"(Which|What|How|Where|Who|When|Why|Select|Choose|In which|According|Based)\b", text):
            parts.append(text)
        elif prev[1] >= 690 and not prev[2].endswith("?"):
            parts[-1] += " " + text
        else:
            parts.append(text)
        prev = (bkey, x1, text)
    q["question"] = "\n".join(parts).strip()
    del q["_stem"]
    # mis-formatted "C. xxx - D yyy" options in the source
    if "D" not in q["options"] and "C" in q["options"]:
        mm = re.match(r"^(.*?)\s+-\s+D\s+(.*)$", q["options"]["C"])
        if mm:
            q["options"]["C"] = mm.group(1).strip()
            q["options"]["D"] = mm.group(2).strip()
    q.pop("_votes_return", None)

# sanity
ids = [q["id"] for q in questions]
assert ids == list(range(1, len(questions) + 1)), "non-sequential ids"
print("questions:", len(questions))
print("no answer:", [q["id"] for q in questions if not q["answer"]])
print("no options:", [q["id"] for q in questions if len(q["options"]) < 2])
print("few opts:", {q["id"]: len(q["options"]) for q in questions if len(q["options"]) not in (4, 5)})
print("no votes:", sum(1 for q in questions if not q["votes"]))
print("no comments:", sum(1 for q in questions if not q["comments"]))
print("answer not in options:", [q["id"] for q in questions if q["answer"] and any(c not in q["options"] for c in q["answer"])])
print("multi-answer:", sum(1 for q in questions if q["answer"] and len(q["answer"]) > 1))
def count_comments(cs):
    return sum(1 + count_comments(c["replies"]) for c in cs)
print("total comments:", sum(count_comments(q["comments"]) for q in questions))
print("warnings:", len(warnings))
for w in warnings[:80]:
    print("  ", w)


def flatten(cs):
    for c in cs:
        yield c
        yield from flatten(c["replies"])

out_q = []
for q in questions:
    comments = list(flatten(q["comments"]))
    sel = Counter(c["selected"] for c in comments if c["selected"])
    community = None
    if q["votes"]:
        community = max(q["votes"], key=lambda v: v["pct"])["choice"]
    elif sel:
        community = sel.most_common(1)[0][0]
    out_q.append({
        "id": q["id"],
        "question": q["question"],
        "options": [{"key": k, "text": v} for k, v in sorted(q["options"].items())],
        "answer": "".join(sorted(q["answer"])),
        "multi": len(q["answer"]) > 1,
        "votes": q["votes"],
        "votesOther": q["votesOther"],
        "selectedCounts": dict(sel.most_common()),
        "community": community,
        "commentCount": len(comments),
    })

os.makedirs(os.path.join(ROOT, "src", "data"), exist_ok=True)
with open(os.path.join(ROOT, "src", "data", "questions.json"), "w") as f:
    json.dump(out_q, f, ensure_ascii=False, separators=(",", ":"))

ddir = os.path.join(ROOT, "public", "discussions")
os.makedirs(ddir, exist_ok=True)
for start in range(0, len(questions), CHUNK):
    chunk = {str(q["id"]): q["comments"] for q in questions[start:start + CHUNK]}
    with open(os.path.join(ddir, f"{start // CHUNK}.json"), "w") as f:
        json.dump(chunk, f, ensure_ascii=False, separators=(",", ":"))
print("wrote", len(out_q), "questions and", (len(questions) + CHUNK - 1) // CHUNK, "discussion chunks")

