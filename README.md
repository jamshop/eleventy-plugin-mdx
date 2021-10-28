# Eleventy Plugin - MDX

This plugin adds an mdx template format to 11ty.

## Usage

Install:

```js
npm install @jamshop/eleventy-plugin-mdx
```

In your 11ty config:

```js
const mdxPlugin = require("@jamshop/eleventy-plugin-mdx");
module.exports = (eleventyConfig) => {
  eleventyConfig.addPlugin(mdxPlugin);
};
```

## Options

If you're using static rendering, which is highly recommended for MDX, you will not need to configure any options for this plugin. If you do hydrate pages a small JS bundle is added to pages and you'll need to make sure that React and ReactDom are available on the global scope. 

To avoid clashes I'm not bundling React by default with the front-end code. I have provided an option `includeCDNLinks` which, as the name suggest, will include React and ReactDOM via CDN links, if you're not providing your own javascript bundle this might be an easy option for you.

Remember that static rendering doesn't require any javascript on the front-end, CDN links won't be included and are not required for any pages unless the `serializeEleventyProps` function is exported.

## MDX stuff

This plugin should do all the MDX stuff. There is a lot more about that here: https://mdxjs.com/getting-started#syntax. Some key things it should do:

- Import local modules from javascript and MDX files.
- Import and export data from MDX.
- Import components from libraries.

I've been meaning to write some test for all this and more - BTW, pull requests are most welcome.

## Static rendering vs Hydration

For the most part you will be able to just use MDX and have it render on the server without a single care. This is the happy path and will yield the best results for your users too. I strongly recommend staying on the happy path.

Then there is hydration. A statically rendered React application won't be interactive in the way a client-side application is. When we render it to HTML it becomes dehydrated, we loose all the juicy JavaScript events and fluid statefulness. To 'hydrate' it on the client we need to inject fresh data so that our application comes back to life.

This is complicated because on the server we have access to everything that 11ty knows about. This often called the 'context' and it includes all 11ty data about posts pages etc... we don't have on the client.

That's why, **for each mdx page you want to hydrate, you need to export a serializeEleventyProps function**. This function is required so that 11ty knows how to serialise the props you need on the page.

For example on this page the server knows the `count` and `title` value from front-matter. But since we want the `<Counter />` component to be interactive, we need to use the `serializeEleventyProps` function to tell the client how to serialize these values.

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

You might be thinking we could make a best guess how to serialise these values. However we don't know what props are used in the MDX, and we were to give it all the data in the context the client bundle would be HUGE. Putting the entire context object in the client is a very bad idea, it's best to just tell us what props you need and `serializeEleventyProps` is the way.

Alternatively, just use static components.

## This is not an SPA

**Note**: These MDX template do not generate single page apps. A bundle is generated for each page.
