#!/usr/bin/env python3
"""ASTROS content engine MVP. No credentials, paid generation or public posting."""
import argparse, datetime as dt, hashlib, json, os, pathlib, re, urllib.request
from zoneinfo import ZoneInfo

ROOT=pathlib.Path(__file__).resolve().parent
DATA=ROOT/"runs"
ET=ZoneInfo("America/New_York")
STAGES=["scout","writer","director","editor","publisher","analyst"]
HOURS={"scout":7,"writer":9,"director":11,"editor":15,"publisher":19,"analyst":0}
TOPICS=["crypto","gaming","space","technology","internet culture"]
FEEDS={
 "technology":"https://www.reddit.com/r/technology/.rss",
 "space":"https://www.reddit.com/r/space/.rss",
 "gaming":"https://www.reddit.com/r/gaming/.rss",
 "crypto":"https://www.reddit.com/r/CryptoCurrency/.rss",
}
def save(path,obj):
 path.parent.mkdir(parents=True,exist_ok=True)
 tmp=path.with_suffix(".tmp")
 tmp.write_text(json.dumps(obj,indent=2,ensure_ascii=False)+"\n")
 tmp.replace(path)
def load(path,default=None):
 return json.loads(path.read_text()) if path.exists() else (default if default is not None else {})
def clean(s): return re.sub(r"\s+"," ",re.sub(r"<[^>]+>","",s)).strip()[:200]
def scout(run):
 import xml.etree.ElementTree as ET
 stories=[]
 for topic,url in FEEDS.items():
  try:
   req=urllib.request.Request(url,headers={"User-Agent":"ASTROSContentResearch/0.1 (editorial research)"})
   with urllib.request.urlopen(req,timeout=12) as response: raw=response.read(400000)
   xml=ET.fromstring(raw)
   for item in xml.findall(".//{http://www.w3.org/2005/Atom}entry")[:5]:
    title=clean(item.findtext("{http://www.w3.org/2005/Atom}title",""))
    link=item.find("{http://www.w3.org/2005/Atom}link")
    href=link.attrib.get("href","") if link is not None else ""
    if title and href: stories.append({"topic":topic,"title":title,"url":href,"source":"Reddit RSS","verified":False})
  except Exception as exc: run.setdefault("warnings",[]).append(f"{topic} feed unavailable: {type(exc).__name__}")
 run["stories"]=stories[:20]
 run["scout_status"]="needs_review" if stories else "blocked_no_sources"
 return run
def writer(run):
 stories=run.get("stories",[])
 if not stories: raise ValueError("No sourced stories. Scout must succeed first.")
 story=stories[0]
 title=story["title"]
 run["script"]={
  "source":story,"status":"draft_unverified","duration_target_seconds":25,
  "hook":f"MISSION CONTROL: Earth is talking about {title[:85]}...",
  "dialogue":[
   {"speaker":"CONTROL","line":"Crew, we've intercepted another transmission from Earth."},
   {"speaker":"ASTRO","line":f"Apparently everyone's talking about {title[:100]}."},
   {"speaker":"CONTROL","line":"Confirm the facts before we launch a reaction."},
   {"speaker":"ASTRO","line":"Copy that. The internet is already in orbit."}],
  "caption":f"Earth's latest transmission has the crew confused. 🚀 #ASTROS #SciFi #Comedy #AICreator",
  "editorial_note":"Draft is NOT fact checked. Verify the source and rewrite jokes before rendering."
 }
 return run
def director(run):
 script=run.get("script")
 if not script: raise ValueError("Writer output required")
 run["shotlist"]=[{"shot":i+1,"seconds":5,"aspect":"9:16","reference":"approved ASTROS NFT character art only",
  "prompt":f"Vertical 9:16 cinematic retro-comic sci-fi, distressed black and burnt orange, cream lettering, consistent approved Astro character. Scene {i+1}: "+scene}
  for i,scene in enumerate(["establish spaceship bridge","closeup Astro reacts to transmission",
    "hologram of Earth news, avoid fabricated screenshots","crew member deadpan reaction","comedic punchline and ASTROS wordmark"])]
 run["assets_status"]="awaiting_generation"
 return run
def editor(run):
 if not run.get("shotlist"): raise ValueError("Director output required")
 run["edit_plan"]={"format":"1080x1920 mp4","fps":30,"variants":["cold_open","reaction_first","punchline_first"],
 "audio":"approved licensed or original sounds only","subtitles":True,"ai_disclosure":True,
 "status":"awaiting_video_assets","rendered_file":None}
 return run
def publisher(run):
 # No auto-posting. Explicit human review and approved integration required.
 run["publishing"]={"status":"awaiting_human_approval","public_posted":False,
 "requires":["fact_checked","approved_video_file","AI disclosure","authorized TikTok publishing integration"]}
 return run
def analyst(run):
 run["analytics"]={"status":"awaiting_real_platform_metrics","views":None,"retention_3s":None,
 "average_watch_seconds":None,"notes":"Never invent metrics. Enter observed results after posting."}
 return run
OPS={"scout":scout,"writer":writer,"director":director,"editor":editor,"publisher":publisher,"analyst":analyst}
def main():
 p=argparse.ArgumentParser()
 p.add_argument("--stage",choices=STAGES+["due"],required=True)
 p.add_argument("--date",help="YYYY-MM-DD, defaults to current ET date")
 p.add_argument("--force",action="store_true",help="Run stage before its scheduled ET hour")
 a=p.parse_args()
 now=dt.datetime.now(ET)
 day=a.date or now.date().isoformat()
 if a.stage=="due":
  # Analyst reviews yesterday's episode at midnight; other stages today.
  stage=next((s for s in STAGES if HOURS[s]==now.hour),None)
  if not stage:
   print("No stage scheduled this hour ET");return
 else: stage=a.stage
 if not a.force and a.stage!="due" and now.date().isoformat()==day and now.hour<HOURS[stage]:
  print("Stage not due yet ET");return
 target=(dt.date.fromisoformat(day)-dt.timedelta(days=1)).isoformat() if stage=="analyst" and a.stage=="due" else day
 path=DATA/target/"run.json"
 run=load(path,{"date":target,"project":"EVENT HORIZON / ASTROS","stages":{},"warnings":[]})
 if run["stages"].get(stage,{}).get("status")=="complete":
  print(f"{stage} already complete for {target}");return
 idx=STAGES.index(stage)
 if idx>0 and stage!="analyst" and run["stages"].get(STAGES[idx-1],{}).get("status")!="complete":
  print(f"Blocked: {STAGES[idx-1]} not complete");return
 try:
  run=OPS[stage](run)
  run["stages"][stage]={"status":"complete","at":now.isoformat()}
 except Exception as exc:
  run["stages"][stage]={"status":"blocked","at":now.isoformat(),"error":str(exc)}
 save(path,run)
 print(json.dumps({"date":target,"stage":stage,"result":run["stages"][stage],"file":str(path)}))
if __name__=="__main__": main()
