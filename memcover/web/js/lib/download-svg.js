//
// Downloads a d3 visualization SVGs taking care of linked css stylesheets
//
//  Only stylesheets with title="embed-svg" will be used
//     <link rel="stylesheet" href="needed-stylesheet.css" media="screen" title="embed-svg">
//
//
// Author: Juan Morales <crispamares at gmail> 
//
// Modification of: https://raw.githubusercontent.com/NYTimes/svg-crowbar/gh-pages/svg-crowbar.js
// Copyright (c) 2013 The New York Times 
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

function downloadSVG(svg, doc) {
    
    window.URL = (window.URL || window.webkitURL);

    doc = doc || document;

    var styles = getStyles(doc);
    console.log("STYLES:", styles);
    var svgInfo = getSVGSource(svg, styles);

    download(svgInfo);
}

function cleanup() {
    var rubbishElements = document.querySelectorAll(".download-svg-rubbish");

    [].forEach.call(rubbishElements, function(el) {
	el.parentNode.removeChild(el);
    });
}


function getSVGSource(svg, styles) {
    var doctype = '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
    var prefix = {
	xmlns: "http://www.w3.org/2000/xmlns/",
	xlink: "http://www.w3.org/1999/xlink",
	svg: "http://www.w3.org/2000/svg"
    };

    var svgInfo = null,

    styles = (styles === undefined) ? "" : styles;

    svg.setAttribute("version", "1.1");

    var defsEl = document.createElement("defs");
    svg.insertBefore(defsEl, svg.firstChild); //TODO   .insert("defs", ":first-child")
    // defsEl.setAttribute("class", "download-svg-rubbish"); 
    
    var styleEl = document.createElement("style");
    defsEl.appendChild(styleEl);
    styleEl.setAttribute("type", "text/css");
    
    
    // removing attributes so they aren't doubled up
    svg.removeAttribute("xmlns");
    svg.removeAttribute("xlink");
    
    // These are needed for the svg
    if (!svg.hasAttributeNS(prefix.xmlns, "xmlns")) {
        svg.setAttributeNS(prefix.xmlns, "xmlns", prefix.svg);
    }
    
    if (!svg.hasAttributeNS(prefix.xmlns, "xmlns:xlink")) {
        svg.setAttributeNS(prefix.xmlns, "xmlns:xlink", prefix.xlink);
    }
    
    var source = (new XMLSerializer()).serializeToString(svg).replace('</style>', '<![CDATA[' + styles + ']]></style>');
    var rect = svg.getBoundingClientRect();
    svgInfo = {
        "class": svg.getAttribute("class"),
        id: svg.getAttribute("id"),
        childElementCount: svg.childElementCount,
        source: [doctype + source]
    };

    return svgInfo;
}

function download(source) {
    var filename = "untitled";

    if (source.id) {
	filename = source.id;
    } else if (source.class) {
	filename = source.class;
    } else if (window.document.title) {
	filename = window.document.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    }

    var url = window.URL.createObjectURL(new Blob(source.source, { "type" : "text\/xml" }));

    var a = document.createElement("a");
    document.body.appendChild(a);
    a.setAttribute("class", "download-svg-rubbish");
    a.setAttribute("download", filename + ".svg");
    a.setAttribute("href", url);
    a.style["display"] = "none";
    a.click();

    setTimeout(function() {
	window.URL.revokeObjectURL(url);
    }, 10);
    setTimeout(function() {
	cleanup(); // removes the added <a></a>
    }, 100);

}

function getStyles(doc) {
    var styles = "",
    styleSheets = doc.styleSheets;

    if (styleSheets) {
	for (var i = 0; i < styleSheets.length; i++) {
	    if (styleSheets[i].title !== "embed-svg") continue;
            processStyleSheet(styleSheets[i]);
	}
    }

    function processStyleSheet(ss) {
	if (ss.cssRules) {
            for (var i = 0; i < ss.cssRules.length; i++) {
		var rule = ss.cssRules[i];
		if (rule.type === 3) {
		    // Import Rule
		    processStyleSheet(rule.styleSheet);
		} else {
		    // hack for illustrator crashing on descendent selectors
		    if (rule.selectorText) {
			if (rule.selectorText.indexOf(">") === -1) {
			    styles += "\n" + rule.cssText;
			}
		    }
		}
            }
	}
    }
    return styles;
}

module.exports = downloadSVG;
