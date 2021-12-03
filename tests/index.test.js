const test = require("ava");
const path = require("path");
const EleventyMDX = require("../eleventy-mdx.js");
const eleventyMDX = new EleventyMDX({ includeCDNLinks: true, components: { GlobalComponent: () => "global component works" } });

test("test basic render", async (t) => {
  const src = path.join(__dirname, "./stubs/basic.mdx")
  let { data } = await eleventyMDX.getInstanceFromInputPath(src);
  t.snapshot(await eleventyMDX.compile(null, src)(data));
});


test("test global component", async (t) => {
  const src = path.join(__dirname, "./stubs/global-component.mdx");
  let { data } = await eleventyMDX.getInstanceFromInputPath(src);
  t.snapshot(await eleventyMDX.compile(null, src)(data));
});

test("imports", async (t) => {
  const src = path.join(__dirname, "./stubs/imports.mdx");
  let { data } = await eleventyMDX.getInstanceFromInputPath(src);
  t.snapshot(await eleventyMDX.compile(null, src)(data));
});


test("permalink compile", async (t) => {
  t.snapshot(await eleventyMDX.compile("/{{slug}}")({ slug: "test" }));
});
