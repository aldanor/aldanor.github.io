function addLineNumbers() {
    var elements = document.querySelectorAll('.highlight.line-numbers pre code');
    for (var i=0, element; element = elements[i++];) {
        var code = element.textContent;
        if (code) {
            var pre = element.parentNode;
            if (!/\s*\bline-numbers\b\s*/.test(pre.className)) {
                pre.className += ' line-numbers';
            }

            code = code.replace(/^(?:\r?\n|\r)/,'');
            var len = code.match(/\n(?!$)/g).length + 1;
            var wrapper = document.createElement('span');
            wrapper.className = 'line-numbers-rows';
            wrapper.innerHTML = new Array(len + 1).join('<span></span>');;
            element.appendChild(wrapper);
        }
    }
}

if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', addLineNumbers);
}
