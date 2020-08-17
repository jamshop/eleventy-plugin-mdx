const React = require("react");
const { renderToString, renderToStaticMarkup } = require("react-dom/server");
const theSadness = require("./webpack-sadness");
const path = require("path");
const requireFromString = require("require-from-string");
const ROOT_ID = "MDX_ROOT";

let HYDRATE_SCRIPT = "";
module.exports = (
  eleventyConfig,
  { components = {}, webpackConfig = {} } = {}
) => {
  process.env.ELEVENTY_EXPERIMENTAL = "true";
  eleventyConfig.addTemplateFormats("mdx");
  eleventyConfig.addExtension("mdx", {
    init: async () => {
      const sadness = await theSadness(
        {
          hydrate: require.resolve(path.join(__dirname, "hydrate.js")),
        },
        { externals: undefined, ...webpackConfig }
      );
      HYDRATE_SCRIPT = sadness["hydrate.js"];
    },
    compile: (_, inputPath) => async (props) => {
      let hydrateScript = "";
      // Get webpack to compile the actual file so it can resolve includes
      // I'd rather build some code from the mdxString, but impossible?
      const serverSadness = await theSadness(
        { main: inputPath },
        { target: "node" }
      );
      const sadness = await theSadness({ main: inputPath });

      // "require" the sadness from a string
      const { Component, serializeEleventyProps } = requireFromString(
        `const React = require("react");
${serverSadness["main.js"]}
const Component = MDXPlugin_main.default || MDXPlugin_main;
const serializeEleventyProps = MDXPlugin_main.serializeEleventyProps;
module.exports = { Component, serializeEleventyProps }
`
      );

      const rootComponent = React.createElement(
        "div",
        // I'm wrapping this in a div with an explicit ID to ensure I always hydrate the right container
        { id: ROOT_ID },
        React.createElement(Component, { components, ...props }, null)
      );

      // Maybe unsafe
      if (serializeEleventyProps) {
        hydrateScript = `
        <script>
        (function(){
          ${HYDRATE_SCRIPT}
          const hydrate = MDXPlugin_hydrate.hydrate;
          const React = MDXPlugin_hydrate.React;

          ${sadness["main.js"]}
          const Component = MDXPlugin_main.default || MDXPlugin_main;
          const props = JSON.parse(${JSON.stringify(
            JSON.stringify(serializeEleventyProps(props))
          )});
          
          hydrate(
            Component,
            { components: {}, ...props},
            document.querySelector('#${ROOT_ID}')
          );
        })();
        </script>`;
      }

      // If they opt for a static render let's give them `renderToStaticMarkup`
      // Otherwise we will hydrate
      const mdxMarkUp = serializeEleventyProps
        ? renderToString(rootComponent)
        : renderToStaticMarkup(rootComponent);

      return mdxMarkUp + "\n" + hydrateScript;
    },
  });
};
