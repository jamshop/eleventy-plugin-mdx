const test = require("ava");
const path = require("path");
const EleventyMDX = require("../eleventy-mdx.js");

const mdxPlugin = new EleventyMDX({includeCDNLinks:true, components: { GlobalComponent: () => "global component works"} });
test("test basic render", async (t) => {
  let {data} = await mdxPlugin.getInstanceFromInputPath(path.join(__dirname, "./stubs/basic.mdx"));
  t.snapshot(await mdxPlugin.compile()(data));
});


test("test global component", async (t) => {
  let {data} = await mdxPlugin.getInstanceFromInputPath(path.join(__dirname, "./stubs/global-component.mdx"));
  t.snapshot(await mdxPlugin.compile()(data));
});

test("imports", async (t) => {
  let {data} = await mdxPlugin.getInstanceFromInputPath(path.join(__dirname, "./stubs/imports.mdx"));
  t.snapshot(await mdxPlugin.compile()(data));
});