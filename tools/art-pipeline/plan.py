"""Astros v3 plan: 1,000 AI-illustrated pieces (option b). Deterministic from SEED.
Writes: plan.json (traits + prompt per token), metadata/<n>.json (Metaplex standard), distribution.json,
        manifest.json (resumable progress; only created if missing), ../../site/astros.json + site examples.
Run: python3 astros/v3/plan.py   (safe to re-run; manifest.json is never overwritten, plan is stable for a given SEED)"""
import json, random, hashlib, os, shutil, collections
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.join(HERE, "..", "..", "site")
SEED = 20261112; N = 1000
TIERS = [("Common", 550, 1, "#b6afa2", "Stone"), ("Uncommon", 250, 2, "#87cca1", "Mint"), ("Rare", 120, 3, "#7dc9fd", "Sky"), ("Epic", 60, 4, "#68488b", "Violet"), ("Legendary", 20, 5, "#cb7005", "Amber")]
COLORS = {"Common": "#b9b4ac", "Uncommon": "#3fcf8e", "Rare": "#4aa3ff", "Epic": "#a56bff", "Legendary": "#ffb040"}
LOOKS = {
 "Common": "A chubby astronaut in a worn pastel suit, visor lifted, a bored face. Plain and proud.",
 "Uncommon": "Trim stripes, mirrored shades or goggles, and a hand-drawn extra: lollipop, straw, bubblegum, a silly hat.",
 "Rare": "Shiny metallic suit, glowing visor rim, gold chain or comms gear, sparks in the air.",
 "Epic": "Dark plasma-veined suit, glowing eyes, alien skin, a halo, particles and dripping plasma.",
 "Legendary": "Gilded, void or cosmic suit, a face lost to fire or void, crown or halo, wings, aura rays. Includes five hand-made 1/1s."}
ONES = {1: "The Original", 183: "Spaghettified", 196: "Singularity", 275: "Time Dilation", 287: "The Crossed"}
ONE_NOTES = {"The Original": "The first astronaut: worn white suit, smoked visor, the most bored face in the galaxy.", "Spaghettified": "Helmet intact, body stretched into a noodle by tidal forces.", "Singularity": "A void-black suit with molten gold cracks, burning eyes and a halo.", "Time Dilation": "Echoes of one astronaut, caught between ticks.", "The Crossed": "Gilded suit, crown of light, photon wings: past the point of no return."}
ONE_FILES = {1: "the-original", 183: "spaghettified", 196: "singularity", 275: "time-dilation", 287: "the-crossed"}
KEYS = ["Skin", "Expression", "Eyes", "Visor", "Suit", "Hair", "Facial Hair", "Face Mark", "Mouth Item", "Neck", "Headgear", "Helmet Detail", "Suit Detail", "Effect"]
NEWKEYS = ["Hair", "Facial Hair", "Face Mark", "Helmet Detail", "Suit Detail"]
HID = "Hidden by visor"
def T(**k): return k
# traits "as drawn" for the five anchors (the approved style-test portraits) and the five 1/1s
ANCHORS = {
 11: ("Common", "common", T(Skin="Peach", Expression="Bored", Eyes="Normal", Visor="Open", Suit="Classic White", **{"Mouth Item": "None"}, Neck="None", Headgear="None", Effect="None")),
 18: ("Uncommon", "uncommon", T(Skin="Tan", Expression="Smirk", Eyes="Normal", Visor="Mirror Shades Gold", Suit="Teal Trim", **{"Mouth Item": "Straw"}, Neck="Dog Tag", Headgear="None", Effect="None")),
 10: ("Rare", "rare", T(Skin="Deep", Expression="Bored", Eyes="Normal", Visor="Glow Rim Cyan", Suit="Steel Blue", **{"Mouth Item": "None"}, Neck="Gold Chain", Headgear="None", Effect="Sparks")),
 158: ("Epic", "epic", T(Skin="Lavender", Expression="Bored", Eyes="Glowing Violet", Visor="Open", Suit="Plasma Violet", **{"Mouth Item": "None"}, Neck="None", Headgear="Halo Ring", Effect="Particle Storm")),
 179: ("Legendary", "legendary", T(Skin=HID, Expression=HID, Eyes="Burning White", Visor="Supernova Face", Suit="Gilded", **{"Mouth Item": "None"}, Neck="None", Headgear="Crown of Light", Effect="Molten Drip")),
}
ONE_TRAITS = {
 1: T(Skin="Tan", Expression="Bored", Eyes="Normal", Visor="Smoked Glass", Suit="Classic White", **{"Mouth Item": "None"}, Neck="Gold Collar Ring", Headgear="None", Effect="None"),
 183: T(Skin="Peach", Expression="Bored", Eyes="Normal", Visor="Open", Suit="Spaghettified", **{"Mouth Item": "None"}, Neck="None", Headgear="None", Effect="Stretch Glow"),
 196: T(Skin=HID, Expression=HID, Eyes="Burning Gold", Visor="Void", Suit="Void Black", **{"Mouth Item": "None"}, Neck="None", Headgear="Halo Ring", Effect="Aura Rays"),
 275: T(Skin="Peach", Expression="Bored", Eyes="Normal", Visor="Open", Suit="Cosmic Indigo", **{"Mouth Item": "None"}, Neck="None", Headgear="None", Effect="Time Echo"),
 287: T(Skin="Tan", Expression="Bored", Eyes="Normal", Visor="Open", Suit="Gilded", **{"Mouth Item": "Lollipop"}, Neck="None", Headgear="Crown of Light", Effect="Photon Wings"),
}
def w(*items):  # weighted list helper: ("x",3) or "x"
    out = []
    for i in items:
        if isinstance(i, tuple): out += [i[0]] * i[1]
        else: out.append(i)
    return out
POOLS = {
 "Common": dict(Skin=w("Peach", "Tan", "Brown", "Deep", "Pale"), Expression=w("Bored", ("Deadpan", 1), "Sleepy", "Grumpy", "Smug"), Eyes=["Normal"],
   Visor=w(("Open", 3), "Smoked Glass"), Suit=w("Classic White", "Ash Grey", "Rust", "Navy", "Olive Drab", "Sand", "Slate"),
   MouthItem=w(("None", 4), "Straw"), Neck=["None"], Headgear=w(("None", 3), "Antenna", "Daisy"), Effect=["None"]),
 "Uncommon": dict(Skin=w("Peach", "Tan", "Brown", "Deep", "Pale"), Expression=w("Bored", "Smirk", "Smug", "Tongue Out", "Cocky Grin", "Sleepy"), Eyes=["Normal"],
   Visor=w("Open", "Mirror Shades Gold", "Mirror Shades Blue", "Mirror Shades Red", "Amber Goggles"), Suit=w("Teal Trim", "Orange Trim", "Red Trim", "Mustard Trim", "Violet Trim", "Navy Trim"),
   MouthItem=w("None", "Straw", "Lollipop", "Bubblegum"), Neck=w("None", "Dog Tag", "Scarf"), Headgear=w("None", "Propeller Cap", "Party Hat", "Antenna", "Headlamp"), Effect=["None"]),
 "Rare": dict(Skin=w("Peach", "Tan", "Brown", "Deep", "Pale", "Mint", "Sky"), Expression=w("Bored", "Smirk", "Smug", "Deadpan", "Cocky Grin"), Eyes=w("Normal", "Glowing Cyan"),
   Visor=w("Glow Rim Cyan", "Glow Rim Orange", "Glow Rim Pink", "Glow Rim Green", "Chrome Mirror"), Suit=w("Steel Blue", "Rose Gold", "Emerald", "Copper", "Titanium", "Cobalt"),
   MouthItem=w("None", "Straw", "Lollipop", "Bubblegum"), Neck=w("Gold Chain", "Silver Chain", "Scarf", "Dog Tag"), Headgear=w("None", "Headlamp", "Comms Dish", "Antenna"), Effect=w("Sparks", "Rim Light")),
 "Epic": dict(Skin=w("Mint", "Lavender", "Sky", "Moonstone", "Deep"), Expression=w("Bored", "Smug", "Deadpan", "Grumpy", "Smirk"), Eyes=w("Glowing Violet", "Glowing Cyan", "Glowing Crimson", "Glowing Lime"),
   Visor=w(("Open", 3), "Glow Rim Violet"), Suit=w("Plasma Violet", "Plasma Cyan", "Plasma Crimson", "Plasma Lime"),
   MouthItem=w(("None", 3), "Lollipop"), Neck=w("None", "Gold Chain", "Scarf"), Headgear=w("Halo Ring", "Comms Dish", "Headlamp"), Effect=w("Particle Storm", "Plasma Drip")),
 "Legendary": dict(Skin=w("Peach", "Tan", "Pale", "Moonstone"), Expression=w("Bored", "Smug", "Deadpan"), Eyes=w("Normal"),
   Visor=w("Supernova Face", "Eclipse Void", "Burning Eyes Void", "Mirror Gold"), Suit=w("Gilded", "Void Black", "Cosmic Indigo", "Prismatic"),
   MouthItem=w("None", "Lollipop"), Neck=w("None", "Gold Chain"), Headgear=w("Crown of Light", "Halo Ring"), Effect=w("Aura Rays", "Molten Drip", "Photon Wings", "Time Echo")),
}

# ---- v4 variety expansion (Common + light Uncommon). Rare/Epic/Legendary keep their traits; new keys default to "None".
CPOOL = dict(
 Skin=w("Peach", "Tan", "Brown", "Deep", "Pale", "Olive", "Ruddy", "Golden"),
 Expression=w(("Bored", 3), ("Deadpan", 2), ("Sleepy", 2), ("Grumpy", 2), ("Smug", 2), ("Smirk", 2), ("Side-Eye", 2), "Yawn", ("Unimpressed", 2), "Cocky Grin", ("Chewing", 2)),
 Visor=w(("Open", 4), "Smoked Glass"),
 Suit=w("Classic White", "Ash Grey", "Rust", "Navy", "Olive Drab", "Sand", "Slate", "Faded Teal", "Mustard", "Forest Green", "Maroon", "Charcoal", "Dusty Blue"),
 Hair=w(("None", 5), "Sideburns", "Curly Tuft", "Messy Fringe"),
 FacialHair=w(("None", 5), "Mustache", "Stubble", "Short Beard", "Soul Patch"),
 FaceMark=w(("None", 5), "Freckles", "Eyebrow Scar", "Cheek Bandage", "Nose Plaster", "Bruise"),
 MouthItem=w(("None", 5), "Straw", "Toothpick"),
 Neck=w(("None", 5), "Bandana", "Headphones"),
 Headgear=w(("None", 4), "Antenna", "Daisy", "Mic Boom", "Forehead Bandana"),
 HelmetDetail=w(("None", 4), "Star Sticker", "Planet Sticker", "Bolt Sticker", "Dent", "Crack", "Tape Patch", "Scratched Paint"),
 SuitDetail=w(("None", 4), "Stitched Patches", "Oil Stains", "Torn Seam", "Hazard Tape"))
UPOOL = dict(
 Skin=w("Peach", "Tan", "Brown", "Deep", "Pale", "Olive", "Ruddy"),
 Expression=w("Bored", "Smirk", "Smug", "Tongue Out", "Cocky Grin", "Sleepy", "Side-Eye", "Unimpressed"),
 Hair=w(("None", 6), "Sideburns"),
 FacialHair=w(("None", 6), "Mustache", "Stubble", "Short Beard"),
 FaceMark=w(("None", 6), "Freckles", "Cheek Bandage", "Bruise"),
 MouthItem=w("None", "Straw", "Lollipop", "Bubblegum", "Toothpick"),
 Neck=w("None", "Dog Tag", "Scarf", "Bandana", "Headphones"),
 Headgear=w("None", "Propeller Cap", "Party Hat", "Antenna", "Headlamp", "Mic Boom"),
 HelmetDetail=w(("None", 5), "Star Sticker", "Planet Sticker", "Dent", "Tape Patch"),
 SuitDetail=w(("None", 6), "Stitched Patches", "Oil Stains"))
CBACK = [("Stone", "#b6afa2", "stone-colored"), ("Stone", "#b6afa2", "stone-colored"), ("Sage", "#a8b49b", "muted sage-green"), ("Dusty Blue", "#9eb0c0", "muted dusty blue-grey"), ("Clay", "#c4a592", "muted clay-pink"), ("Sand", "#c9b88a", "muted warm sand-yellow"), ("Mauve", "#b3a2b2", "muted mauve-grey")]
BACKDROPS = {x[0]: (x[1], x[2]) for x in CBACK}
EXTRA_KEYS = ["Hair", "Facial Hair", "Face Mark", "Mouth Item", "Neck", "Headgear", "Helmet Detail", "Suit Detail"]
EXTRA_CAP = {"Common": 3, "Uncommon": 4}
def draw_v4(tier, rnd):
    base = POOLS[tier]; ext = CPOOL if tier == "Common" else UPOOL
    for _try in range(200):
        t = {}
        for k in KEYS:
            pk = k.replace(" ", "")
            P = ext[pk] if pk in ext else (base[pk] if pk in base else ["None"])
            t[k] = rnd.choice(P)
        if tier == "Common": t["Eyes"] = "Normal"
        shades = t["Visor"].startswith("Mirror") or t["Visor"] in ("Amber Goggles", "Chrome Mirror")
        if shades:
            if t["Expression"] == "Sleepy": t["Expression"] = "Bored"
            t["Eyes"] = "Hidden by shades"
            if t["Face Mark"] == "Eyebrow Scar": t["Face Mark"] = "None"
        if t["Visor"] == "Smoked Glass":   # face is only dimly visible behind dark glass: no fine face detail
            for k in ("Hair", "Facial Hair", "Face Mark"): t[k] = "None"
            if t["Headgear"] == "Forehead Bandana": t["Headgear"] = "None"
        if t["Headgear"] == "Forehead Bandana" and (t["Visor"] != "Open" or t["Hair"] == "Messy Fringe"): t["Headgear"] = "None"
        if t["Expression"] in ("Yawn", "Chewing", "Tongue Out") and t["Mouth Item"] != "None": t["Mouth Item"] = "None"
        if t["Expression"] == "Yawn" and t["Facial Hair"] == "Mustache": t["Facial Hair"] = "None"
        if t["Facial Hair"] != "None" and t["Mouth Item"] in ("Lollipop", "Bubblegum", "Straw"): t["Mouth Item"] = "None"
        if t["Neck"] == "Bandana" and t["Facial Hair"] == "Short Beard": t["Neck"] = "None"
        if t["Neck"] == "Scarf" and t["Neck"] == "Bandana": pass
        if sum(1 for k in EXTRA_KEYS if t[k] != "None") <= EXTRA_CAP[tier]: return t
    return t
HIDDEN_VISORS = {"Supernova Face", "Eclipse Void", "Burning Eyes Void", "Void"}
def draw(tier, rnd):
    P = POOLS[tier]; t = {}
    for k in KEYS:
        pk = k.replace(" ", "")
        t[k] = rnd.choice(P[pk])
    if t["Visor"] in HIDDEN_VISORS:
        t["Skin"] = HID; t["Expression"] = HID
        t["Eyes"] = {"Supernova Face": "Burning White", "Eclipse Void": "None", "Burning Eyes Void": "Burning Gold"}[t["Visor"]]
    elif t["Visor"].startswith("Mirror") or t["Visor"] in ("Amber Goggles", "Chrome Mirror"):
        if t["Expression"] in ("Sleepy",): t["Expression"] = "Bored"   # eyes are hidden behind shades, show a mouth-only expression
        t["Eyes"] = "Hidden by shades"
    if t["Eyes"] == "Glowing Cyan" and tier == "Rare" and not t["Visor"].startswith("Glow Rim"): pass
    return t

SKIN = {"Olive": "honey-brown", "Ruddy": "ruddy sunburnt reddish-tan", "Golden": "golden-tan", "Peach": "peach", "Tan": "warm tan", "Brown": "medium brown", "Deep": "deep dark brown", "Pale": "pale cream", "Mint": "alien pale mint-green", "Lavender": "alien soft lavender", "Sky": "alien sky-blue", "Moonstone": "alien pearly grey-white moonstone"}
EXPR = {"Bored": "heavy half-lidded bored eyes with dark circles and a flat unimpressed mouth", "Deadpan": "half-lidded deadpan stare, one eyebrow slightly raised, perfectly flat mouth",
  "Sleepy": "droopy nearly-closed sleepy eyes with heavy eyebags and a slightly open mouth", "Grumpy": "half-lidded irritated eyes under low angled brows and a downturned frown",
  "Smug": "half-lidded smug eyes, one eyebrow raised, a small self-satisfied smirk", "Smirk": "half-lidded eyes and a wide lopsided smirk",
  "Tongue Out": "half-lidded cheeky eyes and a tongue sticking out", "Cocky Grin": "half-lidded eyes and a wide cocky grin",
  "Side-Eye": "half-lidded eyes glancing sideways to the right with a skeptical look and a flat mouth", "Yawn": "eyes squeezed shut and a big wide-open yawning mouth", "Unimpressed": "one eyebrow cocked high, eyes rolled slightly upward, mouth pressed into a flat line", "Chewing": "half-lidded content eyes, cheeks puffed slightly, mouth closed and chewing"}
SUIT = {"Faded Teal": "worn faded teal", "Mustard": "worn dusty mustard-yellow", "Forest Green": "worn forest-green", "Maroon": "worn maroon", "Charcoal": "worn charcoal-grey", "Dusty Blue": "worn dusty light-blue", "Classic White": "worn off-white", "Ash Grey": "worn ash-grey", "Rust": "worn rust-red", "Navy": "worn navy-blue", "Olive Drab": "worn olive-drab", "Sand": "worn sand-beige", "Slate": "worn slate-blue-grey",
  "Teal Trim": "teal-green with orange trim stripes", "Orange Trim": "off-white with bold orange trim stripes", "Red Trim": "grey with red trim stripes", "Mustard Trim": "olive with mustard-yellow trim stripes", "Violet Trim": "off-white with violet trim stripes", "Navy Trim": "navy with white trim stripes",
  "Steel Blue": "metallic steel-blue with solar-panel patches", "Rose Gold": "polished rose-gold metallic", "Emerald": "polished metallic emerald-green", "Copper": "polished metallic copper", "Titanium": "brushed titanium grey metallic", "Cobalt": "polished metallic cobalt-blue",
  "Plasma Violet": "dark charcoal armor with glowing violet energy veins like cracks", "Plasma Cyan": "dark charcoal armor with glowing cyan energy veins like cracks", "Plasma Crimson": "dark charcoal armor with glowing crimson energy veins like cracks", "Plasma Lime": "dark charcoal armor with glowing acid-lime energy veins like cracks",
  "Gilded": "solid gilded gold with engraved filigree", "Void Black": "obsidian-black with molten gold cracks", "Cosmic Indigo": "deep indigo-violet with tiny stars", "Prismatic": "iridescent prismatic holographic metal"}
VISOR = {"Open": "visor lifted open so the chubby face is fully visible", "Smoked Glass": "visor lowered as translucent smoked dark glass with the face dimly visible behind it",
  "Mirror Shades Gold": "visor lowered as mirrored green-gold reflective shades covering the eyes while cheeks, nose and mouth stay visible", "Mirror Shades Blue": "visor lowered as mirrored blue reflective shades covering the eyes while cheeks, nose and mouth stay visible",
  "Mirror Shades Red": "visor lowered as mirrored red-orange reflective shades covering the eyes while cheeks, nose and mouth stay visible", "Amber Goggles": "thick amber-lensed aviator goggles over the eyes while cheeks, nose and mouth stay visible",
  "Glow Rim Cyan": "visor lifted open with a glowing cyan light strip along the helmet rim", "Glow Rim Orange": "visor lifted open with a glowing orange light strip along the helmet rim", "Glow Rim Pink": "visor lifted open with a glowing hot-pink light strip along the helmet rim",
  "Glow Rim Green": "visor lifted open with a glowing green light strip along the helmet rim", "Glow Rim Violet": "visor lifted open with a glowing violet light strip along the helmet rim", "Chrome Mirror": "visor lowered as chrome mirror glass covering the eyes while cheeks, nose and mouth stay visible",
  "Supernova Face": "no face visible: the visor opening is filled with blazing white-orange supernova fire with two glowing white burning eyes", "Eclipse Void": "no face visible: the visor opening is a perfect black void with a thin glowing golden eclipse ring",
  "Burning Eyes Void": "no face visible: the entire visor opening is filled with solid pitch-black emptiness, no skin, nose or mouth at all, with only two glowing white-gold burning eyes floating in the dark", "Mirror Gold": "visor lowered as mirrored gold reflective glass covering the eyes while cheeks, nose and mouth stay visible"}
MOUTH = {"Toothpick": "a wooden toothpick in the corner of the mouth", "None": "", "Straw": "a red-and-white striped drinking straw in the corner of the mouth", "Lollipop": "a big round rainbow-swirl lollipop candy on a white stick held in the corner of the mouth, the round candy clearly visible", "Bubblegum": "a pink bubblegum bubble blown from the mouth"}
NECK = {"Bandana": "a faded red bandana knotted around the neck", "Headphones": "a pair of big over-ear headphones hanging around the neck", "None": "", "Dog Tag": "a thin ball-chain dog tag necklace over the collar", "Gold Chain": "a chunky gold chain necklace with a plain smooth blank hexagonal pendant, no markings or symbols on it", "Silver Chain": "a chunky silver chain necklace with a plain smooth blank hexagonal pendant, no markings or symbols on it", "Scarf": "a thick chunky knitted scarf in red and cream stripes wrapped around the neck, clearly visible over the collar ring"}
HEAD = {"Mic Boom": "a thin boom microphone arm curving from the ear pod toward the mouth", "Forehead Bandana": "a faded red bandana tied around the forehead just under the helmet rim", "None": "", "Antenna": "a small antenna with a red bulb on top of the helmet", "Daisy": "a daisy flower stuck on top of the helmet", "Propeller Cap": "a colorful propeller beanie cap perched on top of the helmet",
  "Party Hat": "a small striped party hat on top of the helmet", "Headlamp": "a headlamp mounted on the helmet brow", "Comms Dish": "a small round satellite dish (a concave disc on a short arm, not a rod antenna) mounted on the side of the helmet", "Halo Ring": "a thin glowing halo ring floating above the helmet",
  "Crown of Light": "a floating crown of golden light above the helmet"}
HAIR = {"None": "", "Sideburns": "short dark sideburns showing at the edges of the face under the helmet", "Curly Tuft": "a curly tuft of hair peeking out under the front rim of the helmet", "Messy Fringe": "a messy fringe of hair poking out under the front rim of the helmet over the forehead"}
FHAIR = {"None": "", "Mustache": "a bushy mustache above the mouth", "Stubble": "dark stubble shadow across the jaw and chin", "Short Beard": "a short trimmed beard on the chin and jaw", "Soul Patch": "a small soul-patch beard under the lower lip"}
MARK = {"None": "", "Freckles": "freckles across the nose and cheeks", "Eyebrow Scar": "a small scar cutting through the left eyebrow", "Cheek Bandage": "a small adhesive bandage on the cheek", "Nose Plaster": "a plaster strip across the bridge of the nose", "Bruise": "a faint bruise on the cheek"}
HDET = {"None": "", "Star Sticker": "a small peeling yellow star sticker on the helmet shell", "Planet Sticker": "a small peeling ringed-planet sticker on the helmet shell", "Bolt Sticker": "a small peeling lightning-bolt sticker on the helmet shell", "Dent": "a visible dent in the helmet shell", "Crack": "a crack running across the helmet shell", "Tape Patch": "a patch of silver duct tape on the helmet shell", "Scratched Paint": "heavy scratches and chipped paint on the helmet shell"}
SDET = {"None": "", "Stitched Patches": "mended stitched fabric patches on the suit sleeve", "Oil Stains": "dark oil stains on the suit chest", "Torn Seam": "a torn frayed seam on the suit shoulder", "Hazard Tape": "a strip of yellow-and-black hazard tape on the suit shoulder, no text on it"}
EYES = {"Glowing Cyan": "the eyes glow cyan", "Glowing Violet": "the irises glow violet", "Glowing Crimson": "the irises glow crimson", "Glowing Lime": "the irises glow acid lime"}
EFFECT = {"None": "", "Sparks": "a few small glowing sparks floating beside the helmet", "Rim Light": "a strong colored rim light glowing around the silhouette", "Particle Storm": "small glowing particles drifting around the head",
  "Plasma Drip": "glowing plasma goo dripping from the collar", "Aura Rays": "radiating golden light rays behind the head", "Molten Drip": "molten gold dripping from the collar", "Photon Wings": "large glowing photon wings of light feathers spreading behind the shoulders", "Time Echo": "five fading ghosted afterimage echoes of the astronaut trailing behind in a motion smear"}
IDENT = "Same chubby astronaut character, gritty ink-and-paint style, framing and head position as the reference image. "
END = " No scenery, gradient, text, letters, numbers or logos. Original character."
def prompt(tier, t, bd, bdname=None):
    hid = t["Visor"] in HIDDEN_VISORS; parts = []
    parts.append(f"Variant: {tier.upper()} tier Astro.")
    parts.append(f"Suit and helmet: {SUIT[t['Suit']]} suit" + (" and helmet" if t['Suit'] in ("Gilded", "Void Black", "Prismatic") or t['Suit'].startswith(("Plasma", "Steel", "Rose", "Emerald", "Copper", "Titanium", "Cobalt")) else "") + ".")
    parts.append(VISOR[t["Visor"]].capitalize() + ".")
    if not hid and t["Eyes"] != "Hidden by shades":
        parts.append(f"The face is a chubby round {SKIN[t['Skin']]}-skinned cartoon face with {EXPR[t['Expression']]}." + (" " + EYES[t["Eyes"]].capitalize() + "." if t["Eyes"] in EYES else ""))
    elif not hid:
        parts.append(f"The chubby round {SKIN[t['Skin']]}-skinned face below the shades shows the mouth expression: " + {"Bored": "flat unimpressed mouth", "Deadpan": "perfectly flat mouth", "Grumpy": "downturned frown", "Smug": "small smug smirk", "Smirk": "wide lopsided smirk", "Tongue Out": "tongue sticking out", "Cocky Grin": "cocky grin", "Side-Eye": "flat mouth pulled slightly to one side", "Yawn": "big wide-open yawning mouth", "Unimpressed": "mouth pressed into a flat line", "Chewing": "closed mouth chewing with slightly puffed cheeks"}.get(t["Expression"], "flat mouth") + ".")
    for d, k in ((HAIR, "Hair"), (FHAIR, "Facial Hair"), (MARK, "Face Mark"), (MOUTH, "Mouth Item"), (NECK, "Neck"), (HEAD, "Headgear"), (HDET, "Helmet Detail"), (SDET, "Suit Detail"), (EFFECT, "Effect")):
        if k not in t: continue
        if d[t[k]]: parts.append(d[t[k]][0].upper() + d[t[k]][1:] + ".")
    parts.append(f"The backdrop is a flat solid {bdname or (dict((x[0], x[4]) for x in TIERS)[tier].lower() + '-colored')} background ({bd}).")
    return IDENT + " ".join(parts) + END
def refs_for(tier):
    r = ["astros/v3/refs/common.jpg"]
    if tier in ("Rare", "Epic", "Legendary"): r.append(f"astros/v3/refs/{tier.lower()}.jpg")
    return r

def build():
    rnd = random.Random(SEED)
    fixed = {}
    for n, (tier, f, t) in ANCHORS.items(): fixed[n] = (tier, t, f"refs/{f}.jpg", None)
    for n, title in ONES.items(): fixed[n] = ("Legendary", ONE_TRAITS[n], f"oneofone/{ONE_FILES[n]}.jpg", title)
    counts = {t[0]: t[1] for t in TIERS}; need = dict(counts)
    for n, (tier, *_r) in fixed.items(): need[tier] -= 1
    free = [n for n in range(1, N + 1) if n not in fixed]
    rnd.shuffle(free)
    tier_of = {n: v[0] for n, v in fixed.items()}; i = 0
    for tname, _c, *_x in TIERS:
        for _ in range(need[tname]): tier_of[free[i]] = tname; i += 1
    assert i == len(free)
    recs = {}; seen = set(); bd = {t[0]: t[3] for t in TIERS}
    frozen = {p["n"]: p for p in json.load(open(os.path.join(HERE, "plan_v3a.json")))}
    mp0 = os.path.join(HERE, "manifest.json"); man0 = json.load(open(mp0))["tokens"] if os.path.exists(mp0) else {}
    # Traits are frozen as soon as a piece has been ingested (manifest stores them), and always for Rare+ and anchors/1-1s.
    def keep(n, tier):
        if n in fixed: return True
        if "traits" in man0.get(str(n), {}): return True
        return tier in ("Rare", "Epic", "Legendary")
    def traits_of(n):
        m = man0.get(str(n), {})
        return dict(m["traits"]) if "traits" in m else dict(frozen[n]["traits"])
    for n in range(1, N + 1):
        tier = tier_of[n]
        if n in fixed: t = dict(fixed[n][1])
        elif keep(n, tier): t = traits_of(n)
        else: continue
        for k in NEWKEYS: t.setdefault(k, "None")
        seen.add(tuple(t[k] for k in KEYS))
    for n in range(1, N + 1):
        tier = tier_of[n]; src = None; title = None; bname = dict((x[0], x[4]) for x in TIERS)[tier]; back = (bd[tier], bname.lower() + "-colored")
        if n in fixed:
            _, t, src, title = fixed[n]; t = dict(t)
        elif keep(n, tier):
            t = traits_of(n)
        else:
            rn = random.Random("%d-%d" % (SEED + 4, n))
            for _try in range(400):
                t = draw_v4(tier, rn)
                if t["Visor"] in HIDDEN_VISORS: t["Mouth Item"] = "None"
                key = tuple(t[k] for k in KEYS)
                if key not in seen: break
            else: raise SystemExit("could not find unique traits for #%d" % n)
            seen.add(key)
            if tier == "Common":
                bname, bh, bphrase = rn.choice(CBACK); back = (bh, bphrase)
        for k in NEWKEYS: t.setdefault(k, "None")
        mb = man0.get(str(n), {}).get("backdrop")
        if mb: bname = mb["name"]; back = (mb["hex"], BACKDROPS.get(bname, (0, bname.lower() + "-colored"))[1])
        elif tier == "Common" and (n in fixed or keep(n, tier)): bname = "Stone"; back = ("#b6afa2", "stone-colored")
        recs[n] = dict(n=n, tier=tier, traits=t, title=title, source=src, refs=refs_for(tier), backdrop={"name": bname, "hex": back[0]}, prompt=None if src else prompt(tier, t, back[0], back[1] if tier == "Common" else None))
    return recs

def meta(r):
    t = r["traits"]; tier = r["tier"]; lvl = {x[0]: x[2] for x in TIERS}[tier]
    attrs = [{"trait_type": "Tier", "value": tier}, {"trait_type": "Tier Level", "value": lvl, "display_type": "number"}, {"trait_type": "Backdrop", "value": r["backdrop"]["name"]}]
    attrs += [{"trait_type": k, "value": t[k]} for k in KEYS]
    attrs.append({"trait_type": "Edition", "value": "1 of 1" if r["title"] else "Series"})
    if r["title"]: attrs.append({"trait_type": "1/1 Title", "value": r["title"]})
    n = r["n"]
    return {"name": f"Astro #{n}", "symbol": "ASTRO", "description": "Astros are the crew of the $HORIZON mission log: collectible, hand-illustrated astronaut avatars. Concept collection. No promised value.",
            "image": f"{n}.jpg", "external_url": "", "attributes": attrs, "properties": {"category": "image", "files": [{"uri": f"{n}.jpg", "type": "image/jpeg"}]}}

def main():
    recs = build()
    os.makedirs(os.path.join(HERE, "metadata"), exist_ok=True); os.makedirs(os.path.join(HERE, "images"), exist_ok=True)
    json.dump([recs[n] for n in sorted(recs)], open(os.path.join(HERE, "plan.json"), "w"), indent=1)
    for n, r in recs.items(): json.dump(meta(r), open(os.path.join(HERE, "metadata", f"{n}.json"), "w"), indent=2)
    dist = {"supply": N, "seed": SEED, "tiers": {}, "traits": {}}
    for tname, c, *_ in TIERS:
        rs = [r for r in recs.values() if r["tier"] == tname]; assert len(rs) == c, (tname, len(rs))
        dist["tiers"][tname] = {"count": c, "percent": round(c / N * 100, 2), "tokens_1_1": sorted(r["n"] for r in rs if r["title"])}
        dist["traits"][tname] = {k: dict(collections.Counter(r["traits"][k] for r in rs)) for k in KEYS}
    json.dump(dist, open(os.path.join(HERE, "distribution.json"), "w"), indent=2)
    mp = os.path.join(HERE, "manifest.json")
    if not os.path.exists(mp):
        man = {"supply": N, "stats": {"calls": 0, "accepted": 0, "rejected": 0}, "tokens": {}}
        for n, r in recs.items():
            if r["source"]:
                shutil.copyfile(os.path.join(HERE, r["source"]), os.path.join(HERE, "images", f"{n}.jpg"))
                man["tokens"][str(n)] = {"status": "done", "attempts": 0, "origin": "style-test anchor" if n in ANCHORS else "hand-made 1/1", "qa": "visual-ok"}
            else: man["tokens"][str(n)] = {"status": "pending", "attempts": 0}
        json.dump(man, open(mp, "w"), indent=1)
    # site catalog
    site = {"_note": "Written by astros/v3/plan.py. Concept collection of 1,000 AI-illustrated Astros; nothing minted.", "collection": {"name": "Astros", "symbol": "ASTRO", "supply": N, "seed": SEED},
            "tiers": [{"id": t[0], "level": t[2], "share": t[1] / N, "color": COLORS[t[0]], "stars": t[2], "look": LOOKS[t[0]], "backdrop": t[3]} for t in TIERS],
            "oneOfOnes": [{"n": n, "title": ONES[n], "note": ONE_NOTES[ONES[n]]} for n in sorted(ONES)]}
    json.dump(site, open(os.path.join(SITE, "astros.json"), "w"), indent=1)
    print("planned", len(recs), {t[0]: t[1] for t in TIERS}, "unique trait sets:", len({tuple(r['traits'][k] for k in KEYS) for r in recs.values()}))
if __name__ == "__main__": main()
