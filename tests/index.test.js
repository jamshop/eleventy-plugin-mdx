const test = require("ava");
const path = require("path");
const EleventyMDX = require("../eleventy-mdx.js");
const eleventyMDX = new EleventyMDX({includeCDNLinks: true, components: { GlobalComponent: () => "global component works"} });

test("test basic render", async (t) => {
  let {data} = await eleventyMDX.getInstanceFromInputPath(path.join(__dirname, "./stubs/basic.mdx"));
  t.snapshot(await eleventyMDX.compile()(data));
});


test("test global component", async (t) => {
  let {data} = await eleventyMDX.getInstanceFromInputPath(path.join(__dirname, "./stubs/global-component.mdx"));
  t.snapshot(await eleventyMDX.compile()(data));
});

test("imports", async (t) => {
  let {data} = await eleventyMDX.getInstanceFromInputPath(path.join(__dirname, "./stubs/imports.mdx"));
  t.snapshot(await eleventyMDX.compile()(data));
});


test("permalink compile", async (t) => {
  t.snapshot(await eleventyMDX.compile("/{{slug}}")({slug: "test"}));
});
