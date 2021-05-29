# @arijs/vite-plugin-vue-mfc [![npm](https://img.shields.io/npm/v/@arijs/vite-plugin-vue-mfc.svg)](https://npmjs.com/package/@arijs/vite-plugin-vue-mfc)

Note: requires `@vitejs/plugin-vue` as loader for your components.

This plugin is meant to create a virtual file which binds together each 'block' of your component.

Instead of this:

```html
<!-- HelloWorld.vue -->
<template>
    <!-- your html here -->
</template>
<script>
    // your script here
</script>
<style>
    /* your styles here */
</style>
```

You can have this:

```
+ components/
|--+ HelloWorld/
|  |--+ SubComp/
|  |  |--- SubComp.css
|  |  |--- SubComp.html
|  |  `--- SubComp.js
|  |--- HelloWorld.css
|  |--- HelloWorld.html
|  `--- HelloWorld.js
```

```css
/* HelloWorld.css */
.hello-world {}
```

```html
<!-- HelloWorld.html -->
<div class="hello-world">
	<!-- ... -->
</div>
```

```js
// HelloWorld.js
//
// Paths are relative from where the folder is contained, not the files
// In this case, it's relative from 'components/', not from 'HelloWorld/'
// Think of the folder as a virtual 'HelloWorld.vue' file
import SubComp from "./HelloWorld/SubComp.vue";
import { defineComponent } from "vue";

export default defineComponent({
	name: 'HelloWorld',
	components: {
		SubComp,
	},
	// ...
});
```

## How to use

```js
// vite.config.js
import vueMfc from '@arijs/vite-plugin-vue-mfc'
import vue from '@vitejs/plugin-vue'

export default {
  plugins: [vueMfc(), vue()]
}
```

## License

[MIT](LICENSE).
