const EleventyMDX = require("./eleventy-mdx");
const TemplateEngineManager = require("@11ty/eleventy/src/TemplateEngineManager");

const mdxBuildPlugin = (eleventyConfig, { includeCDNLinks = false } = {}) => {

  let templateEngineManager = new TemplateEngineManager(eleventyConfig);
  const eleventyMDX = new EleventyMDX({includeCDNLinks, components: eleventyConfig.javascriptFunctions, templateEngineManager});

  process.env.ELEVENTY_EXPERIMENTAL = "true";
  eleventyConfig.addTemplateFormats("mdx");
  eleventyConfig.addExtension("mdx", {
    read: false,
    data: true,
    getData: true,
    getInstanceFromInputPath: eleventyMDX.getInstanceFromInputPath,
    init: () => { },
    compile: eleventyMDX.compile,
  });

};

module.exports = mdxBuildPlugin;