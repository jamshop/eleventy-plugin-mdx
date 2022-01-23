const EleventyMDX = require("./eleventy-mdx");

const mdxBuildPlugin = (
  eleventyConfig,
  { rehypePlugins = [], remarkPlugins = [], includeCDNLinks = false } = {}
) => {
  const eleventyMDX = new EleventyMDX({
    includeCDNLinks,
    components: eleventyConfig.javascriptFunctions,
  });

  process.env.ELEVENTY_EXPERIMENTAL = "true";
  eleventyConfig.addTemplateFormats("mdx");
  eleventyConfig.addExtension("mdx", {
    read: false,
    data: true,
    getData: true,
    getInstanceFromInputPath: eleventyMDX.getInstanceFromInputPath,
    init: () => {},
    compile: eleventyMDX.compile,
  });
};

module.exports = mdxBuildPlugin;
