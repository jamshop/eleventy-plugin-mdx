const EleventyMDX = require("./eleventy-mdx");

const mdxBuildPlugin = (eleventyConfig, { includeCDNLinks = false } = {}) => {

  const mdxPlugin = new EleventyMDX({includeCDNLinks, components: eleventyConfig.javascriptFunctions});

  process.env.ELEVENTY_EXPERIMENTAL = "true";
  eleventyConfig.addTemplateFormats("mdx");
  eleventyConfig.addExtension("mdx", {
    read: false,
    data: true,
    getData: true,
    getInstanceFromInputPath: mdxPlugin.getInstanceFromInputPath,
    init: () => { },
    compile: mdxPlugin.compile,
  });

};

module.exports = mdxBuildPlugin;