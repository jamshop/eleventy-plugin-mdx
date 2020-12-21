# Eleventy Plugin - MDX

This plugin adds an mdx template format to 11ty.

## Usage

No npm install just yet this is alpha testing and once a few optimisations are done I'll publish on NPM. Until then please raise issues and give me feedback.

Download or clone the repo and then require it in your 11ty config file:

In your 11ty config:

```js
const mdxPlugin = require("../path/to/eleventy-plugin-mdx");
module.exports = (eleventyConfig) => {
  eleventyConfig.addPlugin(mdxPlugin);
};
```

## Options

You can pass some options to the plugin including `components` and `webpackConfig`.

The components object is a mapping between the HTML name and the desired component you’d like to render. You can also provide other global mappings for custom components this way, See: https://mdxjs.com/getting-started#working-with-components

**Alpha note**: I expect this to work for the server render but not after hydration. Replacing top level components remains largely untested. Please open issues.

The `webpackConfig` option allows you to extend the default webpack options. This is provided as an escape hatch, but like an escape hatch on a plane if you open it at the wrong time or the wrong way explosive decompression is likely. I'll be honest, it's probably best if you just don't touch this.

```js
module.exports = (eleventyConfig) => {
  eleventyConfig.addPlugin(mdxPlugin, {
    components: {},
    webpackConfig: {},
  });
};
```

## MDX stuff

This plugin should do all the MDX stuff. There is a lot more about that here: https://mdxjs.com/getting-started#syntax. Some key things it should do:

- Import local modules from javascript and MDX files.
- Import and export data from MDX.
- Import from installed packages.

I've been meaning to write some test for all this and more - it's past time for that. BTW, pull requests are most welcome.

## Static rendering vs Hydration

For the most part you will be able to just use MDX and have it render on the server without a single care. This is the happy path and will yield the best results for your users too. I strongly recommend staying on the happy path.

Then there is hydration. A statically rendered React application won't be interactive in the way a client-side application is. When we render it to HTML it becomes dehydrated, we loose all the juicy JavaScript events and fluid statefulness. To 'hydrate' it on the client we inject fresh data and our application comes back to life.

This is complicated because the state that we gave the application on the server had access to all the rich 11ty data that we don't have on the client.

That's why, **for each mdx page you want to hydrate, you need to export a serializeEleventyProps function**. This function is required so that 11ty knows how to serialise the props you need to the page.

For example on this page the server knows the `count` and `title` value from front-matter. But since we want the `<Counter />` component to be interactive, we need the `serializeEleventyProps` function to tell the client how to serialize these values.

```js
---
title: Eleventy
count: 11
---

import { Counter } from "./counter.js";

<H1>
  {props.title}
</H1>
<Counter start={props.count} />

export const serializeEleventyProps = (props) => ({
  title: props.title,
  count: props.count,
});
```

You might be thinking we could make a best guess how to serialise these values. However since we don't know what props are used, and we want to avoid putting the entire context object in the client, it's best to just tell us what props you need in this way.

**Alpha note:** I'm looking for a better name for this function. Suggestions please.

## This is not an SPA

**Note**: These MDX template do not generate single page apps. A bundle is generated for each page and currently (I think without changes to 11ty) I cannot output a file to the generated site from a plugin. Which means I cannot bundle React separately.
