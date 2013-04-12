Markdown
--------

POST a markdown text, then open a tab and render converted HTML with [PageDown].

If you use Vim text editor, [instant-markdown-vim](https://github.com/teramako/instant-markdown-vim) plugin may help you.

Register `markdown.js` to "File Handlers"

Example
--------

```sh
cat <<EOM | curl -X POST --data-urlencoded "file@-" http://localhost:8090/markdown
Hello Markdown
==============

you will get HTML text.
EOM
```

[PageDown]: http://code.google.com/p/pagedown/

