const mdxPlugin = require("../index.js");

module.exports = function (eleventyConfig) { 
  eleventyConfig.addPlugin(mdxPlugin);
  return {
    templateFormats: ["mdx", "njk"],
  };
}