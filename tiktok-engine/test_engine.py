import importlib.util, pathlib, tempfile, unittest
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("astros_engine",HERE/"engine.py")
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class EngineTests(unittest.TestCase):
 def test_story_without_sources_fails_closed(self):
  with self.assertRaises(ValueError): mod.writer({})
 def test_story_draft_unverified(self):
  r=mod.writer({"stories":[{"title":"Test headline","url":"https://example.org","verified":False}]})
  self.assertEqual(r["script"]["status"],"draft_unverified")
 def test_no_automatic_public_posting(self):
  r=mod.publisher({})
  self.assertFalse(r["publishing"]["public_posted"])
  self.assertEqual(r["publishing"]["status"],"awaiting_human_approval")
 def test_storyboard_5_shots(self):
  r=mod.director({"script":{"dialogue":[]}})
  self.assertEqual(len(r["shotlist"]),5)
 def test_persistence(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=pathlib.Path(tmp)/"run.json";mod.save(p,{"stage":"test"})
   self.assertEqual(mod.load(p)["stage"],"test")
if __name__=="__main__":unittest.main()
