---
---

addLineNumbers = ->
  for element in document.querySelectorAll('.highlight.line-numbers pre code')
    code = element.textContent
    if code
      pre = element.parentNode
      if !/\s*\bline-numbers\b\s*/.test(pre.className)
        pre.className += ' line-numbers'
      code = code.replace(/^(?:\r?\n|\r)/, '')
      len = code.match(/\n(?!$)/g).length + 1
      wrapper = document.createElement 'span'
      wrapper.className = 'line-numbers-rows'
      wrapper.innerHTML = new Array(len + 1).join('<span></span>')
      element.appendChild wrapper
  return

if document.addEventListener
  document.addEventListener 'DOMContentLoaded', addLineNumbers
