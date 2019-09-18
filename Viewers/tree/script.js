const vscode = (() => {
  try { return acquireVsCodeApi() }
  catch (e) { return { postMessage: (...x) => console.log(...x), dummy: true } }
})()

let width = window.innerWidth,
  height = window.innerHeight,
  margin = { top: 20, right: 10, bottom: 20, left: 10 };

let data1 =
{
  "name": "flare",
  "children": [
    {
      "name": "analytics",
      "children": [
        {
          "name": "cluster",
          "children": [
            { "name": "AgglomerativeCluster", "tocc": 4789, "pocc": 3938 },
            { "name": "CommunityStructure", "tocc": 4789, "pocc": 3812 },
            { "name": "HierarchicalCluster", "tocc": 4789, "pocc": 6714 },
            { "name": "MergeEdge", "tocc": 4789, "pocc": 743 }
          ]
        }
      ]
    }
  ]
}

const data2 = {
  "a/b/c": { tocc: 12, pocc: 54, path: "abc" }, "a/b/c": { tocc: 12, pocc: 3, path: "abc" }, "a/b/c": { tocc: 12, pocc: 5, path: "abc" }, "a/b/c": { tocc: 12, pocc: 4, path: "abc" },
  "d/b/c": { tocc: 12, pocc: 54, path: "abc" }, "d/b/c": { tocc: 12, pocc: 3, path: "abc" }, "d/b/c": { tocc: 12, pocc: 5, path: "abc" }, "d/b/c": { tocc: 12, pocc: 4, path: "abc" },
  "d/b/c": { tocc: 12, pocc: 54, path: "abc" }, "d/b/c": { tocc: 12, pocc: 3, path: "abc" }, "d/b/c": { tocc: 12, pocc: 5, path: "abc" }, "d/b/c": { tocc: 12, pocc: 4, path: "abc" },
  "d/b/c": { tocc: 12, pocc: 54, path: "abc" }, "d/b/c": { tocc: 12, pocc: 3, path: "abc" }, "d/b/c": { tocc: 12, pocc: 5, path: "abc" }, "d/b/c": { tocc: 12, pocc: 4, path: "abc" },
  "d/b/c": { tocc: 12, pocc: 54, path: "abc" }, "a/b/c": { tocc: 12, pocc: 3, path: "abc" }, "a/b/c": { tocc: 12, pocc: 5, path: "abc" }, "a/b/c": { tocc: 12, pocc: 4, path: "abc" },
  "a/c/c": { tocc: 12, pocc: 54, path: "abc" }, "a/c/c": { tocc: 12, pocc: 3, path: "abc" }, "a/c/c": { tocc: 12, pocc: 5, path: "abc" }, "a/c/c": { tocc: 12, pocc: 4, path: "abc" },
  "a/c/c": { tocc: 12, pocc: 54, path: "abc" }, "a/c/c": { tocc: 12, pocc: 3, path: "abc" }, "a/c/c": { tocc: 12, pocc: 5, path: "abc" }, "a/c/c": { tocc: 12, pocc: 4, path: "abc" },
  "a/c/c": { tocc: 12, pocc: 54, path: "abc" }, "a/b/c": { tocc: 12, pocc: 7, path: "abc" }, "a/b/c": { tocc: 12, pocc: 50, path: "abc" }
};

const settings_register = {}

function toTree(data) {
  if (Array.isArray(data)) {
    const tmp = {}
    data.forEach(x => {
      const name = '' + x.sl + ':' + x.sc
      if (x.params !== undefined) {
        tmp[name] = tmp[name] || { name: name, sl: x.sl, sc: x.sc, el: x.el, ec: x.ec, children: [] }
        tmp[name].children.push({ ...x, name: x.params === null ? "null" : x.params })
      } else {
        tmp[name] = { ...x, name: name }
      }
    })
    const r2 = []
    for (const key in tmp) {
      if (tmp.hasOwnProperty(key)) {
        r2.push(tmp[key])
      }
    }
    r2.sort((a, b) => a.sl === b.sl ? a.sc - b.sc : a.sl - b.sl)
    return r2
  }
  const r = {};
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const element = data[key];
      const i = key.indexOf('/')
      if (i === -1) {
        r[key] = element
        continue;
      }
      const prefix = key.slice(0, i);
      const suffix = key.slice(i + 1);
      r[prefix] = r[prefix] || {}
      r[prefix][suffix] = element;
    }
  }
  const r2 = []
  for (const key in r) {
    if (r.hasOwnProperty(key)) {
      const element = r[key];
      r2.push({ name: key, children: toTree(element) })
    }
  }
  return r2;
}

const Tree = function (data = undefined) {
  if (data === undefined) {
    if (this.data === undefined) {
      throw 'need data representing the ngrams'
    }
    data = this.data
  } else {
    this.data = data
  }
  let hierarchy = d3.hierarchy;
  let select = d3.select;
  let
    margin = { top: 20, right: 10, bottom: 20, left: 10 },
    height = 800 - margin.top - margin.bottom,
    barHeight = 20,
    barWidth = width * .8,
    i = 0,
    duration = 750,
    tree = d3.tree().size([width, height]).nodeSize([0, 20]),
    root = tree(hierarchy(data)),
    svg = d3.select("div#chart").append('svg')
      .attr('width', width + margin.right + margin.left)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  root.each((d) => {
    d.name = d.id; //transferring name to a name variable
    d.id = i; //Assigning numerical Ids
    i++;
  });
  root.x0 = root.x;
  root.y0 = root.y;

  // this.root.children.forEach(this.collapse);
  update(root, true);

  function connector(d) {
    //curved 
    /*return "M" + d.y + "," + d.x +
       "C" + (d.y + d.parent.y) / 2 + "," + d.x +
       " " + (d.y + d.parent.y) / 2 + "," + d.parent.x +
       " " + d.parent.y + "," + d.parent.x;*/
    //straight
    return "M" + d.parent.y + "," + d.parent.x
      + "V" + d.x + "H" + d.y;
  }

  function collapse(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    }
  };

  function click(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
    }
    update(root);
  };

  function update(source, first = false) {
    let max_right = 0;
    let max_pocc = 0;
    let max_tocc = 0;

    // Compute the new tree layout.
    let nodes = tree(root)
    let nodesSort = [];
    nodes.eachBefore(function (n) {
      nodesSort.push(n);
    });
    height = Math.max(500, nodesSort.length * barHeight + margin.top + margin.bottom);
    let links = nodesSort.slice(1);
    // Compute the "layout".
    nodesSort.forEach((n, i) => {
      n.x = i * barHeight;
    });

    d3.select('svg').transition()
      .duration(duration)
      .attr("height", height);

    // Update the nodes…
    let node = svg.selectAll('g.node')
      .data(nodesSort, function (d) {
        return d.id || (d.id = ++i);
      });

    if (!first) {
      node.each(function (d) {
        max_right = Math.max(this.children[1].getBBox().width + d.y, max_right);
        if (d.data.pocc !== undefined && d.data.pocc !== undefined) {
          max_pocc = Math.max(d.data.pocc, max_pocc);
          max_tocc = Math.max(d.data.tocc, max_tocc);
        }
      })
    }
    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr('transform', function () {
        return 'translate(' + source.y0 + ',' + source.x0 + ')';
      })
      .on('click', click);

    nodeEnter.append('circle')
      .attr('r', '1.5e-6')
      // .attr('cy', '50%')
      .style('fill', function (d) {
        return d._children ? 'lightsteelblue' : '#fff';
      });

    nodeEnter.append('text')
      .attr('x', function (d) {
        return d.children || d._children ? 10 : 10;
      })
      // .attr('dy', '.35em')
      .attr('alignment-baseline', "central")
      .attr('text-anchor', function (d) {
        return d.children || d._children ? 'start' : 'start';
      })
      .text(function (d) {
        if (d.data.name.length > 20) {
          return d.data.name.substring(0, 20) + '...';
        } else {
          return d.data.name;
        }
      })
      .style('fill-opacity', 1e-6);

    nodeEnter.append('svg:title').text(function (d) {
      return d.data.name;
    });

    if (true) {
      if (first) {
        nodeEnter.each(function (d) {
          max_right = Math.max(this.children[1].getBBox().width + d.y, max_right);
          if (d.data.pocc !== undefined && d.data.pocc !== undefined) {
            max_pocc = Math.max(d.data.pocc, max_pocc);
            max_tocc = Math.max(d.data.tocc, max_tocc);
          }
        })
      }

      const frac = (max_pocc + max_tocc) / 200
      const pocc_size = max_pocc / frac
      const tocc_size = max_tocc / frac

      nodeEnter.append("rect")
        .attr("height", 12)
        .attr("width", function (d) { return d.data.pocc === undefined ? 0 : d.data.pocc / max_pocc * pocc_size; })
        .attr("y", -6)
        .attr("x", function (d) { return (1 - (d.data.pocc / max_pocc)) * pocc_size + max_right - d.y; })
        .style("fill", function (d) { return "red" });

      nodeEnter.append("rect")
        .attr("height", 12)
        .attr("width", function (d) { return d.data.tocc === undefined ? 0 : d.data.tocc / max_tocc * tocc_size; })
        .attr("y", -6)
        .attr("x", function (d) { return pocc_size + max_right - d.y; })
        .style("fill", function (d) { return "green" });

      nodeEnter.append("text")
        .attr("height", 10)
        .attr("width", function (d) { return 10; })
        .attr("x", function (d) { return pocc_size + max_right - d.y - 10; })
        .attr('style', 'font-size: 10px')
        .attr('alignment-baseline', "central")
        .attr('text-anchor', function (d) {
          return d.children || d._children ? 'end' : 'end';
        })
        .text(function (d) { return '' + (d.data.pocc || '') });
      nodeEnter.append("text")
        .attr("height", 10)
        .attr("width", function (d) { return 10; })
        .attr("x", function (d) { return pocc_size + max_right - d.y + 10; })
        .attr('style', 'font-size: 10px')
        .attr('alignment-baseline', "central")
        .attr('text-anchor', function (d) {
          return d.children || d._children ? 'start' : 'start';
        })
        .text(function (d) { return '' + (d.data.tocc || '') });
    }

    // Transition nodes to their new position.
    let nodeUpdate = node.merge(nodeEnter)
    // .transition()
    // .duration(duration);

    nodeUpdate
      .attr('transform', function (d) {
        return 'translate(' + d.y + ',' + d.x + ')';
      });

    nodeUpdate.select('circle')
      .attr('r', 4.5)
      .style('fill', function (d) {
        return d._children ? 'lightsteelblue' : '#fff';
      });

    nodeUpdate.select('text')
      .style('fill-opacity', 1);

    // Transition exiting nodes to the parent's new position (and remove the nodes)
    var nodeExit = node.exit()
    // .transition()
    // .duration(duration);

    nodeExit
      .attr('transform', function (d) {
        return 'translate(' + source.y + ',' + source.x + ')';
      })
      .remove();

    nodeExit.select('circle')
      .attr('r', 1e-6);

    nodeExit.select('text')
      .style('fill-opacity', 1e-6);

    // Update the links…
    var link = svg.selectAll('path.link')
      .data(links, function (d) {
        // return d.target.id;
        var id = d.id + '->' + d.parent.id;
        return id;
      }
      );

    // Enter any new links at the parent's previous position.
    let linkEnter = link.enter().insert('path', 'g')
      .attr('class', 'link')
      .attr('d', (d) => {
        var o = { x: source.x0, y: source.y0, parent: { x: source.x0, y: source.y0 } };
        return connector(o);
      });

    // Transition links to their new position.
    link.merge(linkEnter)
      // .transition()
      // .duration(duration)
      .attr('d', connector);


    // // Transition exiting nodes to the parent's new position.
    link.exit()
      // .transition()
      // .duration(duration)
      .attr('d', (d) => {
        var o = { x: source.x, y: source.y, parent: { x: source.x, y: source.y } };
        return connector(o);
      })
      .remove();

    // Stash the old positions for transition.
    nodesSort.forEach(function (d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });

  }
}

const Grid = function (data = undefined) {
  if (data === undefined) {
    if (this.data === undefined) {
      throw 'need data representing the ngrams'
    }
    data = this.data
  } else {
    this.data = data
  }

  let
    size = width / data.length,
    max_pocc = 0,
    max_tocc = 0,
    height = size * Math.max(...data.map(x =>
      (x.sort((a, b) => a.sl === b.sl ? a.sc - b.sc : a.sl - b.sc), x.forEach(x => (max_pocc = Math.max(x.pocc, max_pocc), max_tocc = Math.max(x.tocc, max_tocc))), x.length))), //800 - margin.top - margin.bottom,
    max = Math.max(max_pocc, max_tocc),
    color = d3.scaleSequential(d3.interpolateMagma),
    svg = d3.select("div#chart").append('svg')
      .attr('width', width + margin.right + margin.left)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


  var column = svg.selectAll(".column")
    .data(data)
    .enter().append("g")
    .attr("class", "column")
    .attr("transform", function (d, i) { return 'translate(' + (i * size) + ',' + 0 + ')'; });

  const sel = column.selectAll(".square")
    .data(function (d) { return d; })
    .enter();
  var row = sel.append("polygon")
    .attr("class", "square")
    .attr('points', function (d, i) {
      return `0,${i * size} 0,${i * size + size} ${size},${i * size}`
    })
    // .attr("y", function (d, i) { return i * size; })
    // .attr("width", function (d) { return size; })
    // .attr("height", function (d) { return size; })
    .style("fill", function (d) {
      const col = color(Math.sqrt(Math.sqrt(d.pocc / max + 0.00001)))
      return col;
    })
  var row2 = sel.append("polygon")
    .attr("class", "square")
    .attr('points', function (d, i) {
      return `0,${i * size + size} ${size},${i * size} ${size},${i * size + size}`
    })
    // .attr("y", function (d, i) { return i * size; })
    // .attr("width", function (d) { return size; })
    // .attr("height", function (d) { return size; })
    .style("fill", function (d) {
      const col = color(Math.sqrt(Math.sqrt(d.tocc / max + 0.000001)))
      return col;
    })
  //   .style("stroke", "#222")
  // var row = column.selectAll(".square")
  //   .data(function (d) { return d; })
  //   .enter().append("rect")
  //   .attr("class", "square")
  //   .attr("y", function (d, i) { return i * size; })
  //   .attr("width", function (d) { return size; })
  //   .attr("height", function (d) { return size; })
  //   .style("fill", function (d) {
  //     const col = color(d.pocc / max)
  //     return col;
  //   })
  //   .style("stroke", "#222")
  //   // .on('click', function (d) {
  //   //   d.click = d.click === undefined ? 0 : d.click + 1;
  //   //   if ((d.click) % 4 == 0) { d3.select(this).style("fill", "#fff"); }
  //   //   if ((d.click) % 4 == 1) { d3.select(this).style("fill", "#2C93E8"); }
  //   //   if ((d.click) % 4 == 2) { d3.select(this).style("fill", "#F56C4E"); }
  //   //   if ((d.click) % 4 == 3) { d3.select(this).style("fill", "#838690"); }
  //   // });

  row.append('svg:title').text(function (d) {
    return d.path + ':' + d.sl + ':' + d.sc + ' ' + d.pocc;
  });
  row2.append('svg:title').text(function (d) {
    return d.path + ':' + d.sl + ':' + d.sc + ' ' + d.tocc;
  });
}


const CircularTree = function (data = undefined) {
  if (data === undefined) {
    if (this.data === undefined) {
      throw 'need data representing the ngrams'
    }
    data = this.data
  } else {
    this.data = data
  }
  let
    margin = { top: 20, right: 10, bottom: 20, left: 10 },
    height = 800 - margin.top - margin.bottom,
    barHeight = 20,
    barWidth = width * .8,
    i = 0,
    duration = 750,
    tree = d3.tree().size([width, height]).nodeSize([0, 20]),
    root = tree(hierarchy(data)),
    svg = d3.select("div#chart").append('svg')
      .attr('width', width + margin.right + margin.left)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  root.each((d) => {
    d.name = d.id; //transferring name to a name variable
    d.id = i; //Assigning numerical Ids
    i++;
  });
  root.x0 = root.x;
  root.y0 = root.y;

  // this.root.children.forEach(this.collapse);
  // update(root, true);
  if (true) {
    const link = svg.append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .selectAll("path")
      .data(root.links())
      .join("path")
      .attr("d", d3.linkRadial()
        .angle(d => d.x)
        .radius(d => d.y));

    const node = svg.append("g")
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
      .selectAll("g")
      .data(root.descendants().reverse())
      .join("g")
      .attr("transform", d => `
        rotate(${d.x * 180 / Math.PI - 90})
        translate(${d.y},0)
      `);

    node.append("circle")
      .attr("fill", d => d.children ? "#555" : "#999")
      .attr("r", 2.5);

    node.append("text")
      .attr("dy", "0.31em")
      .attr("x", d => d.x < Math.PI === !d.children ? 6 : -6)
      .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
      .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
      .text(d => d.data.name)
      .clone(true).lower()
      .attr("stroke", "white");
  }
}

const RectTreeMap = function (data = undefined, options = { op: {}, 'margin-top': '0px', 'margin-bottom': '0px' }) {
  if (data === undefined) {
    if (this.data === undefined) {
      throw 'need data representing the ngrams'
    }
    data = this.data
  } else {
    this.data = data
  }

  // path to current node
  const pos_block = document.createElement('div')
  pos_block.classList.add('no-print')
  {
    pos_block.innerHTML = 'path to current node'
    document.getElementById('settings').insertAdjacentElement('beforebegin', pos_block)
    document.getElementById('settings').setAttribute('style', "top:30px;")
  }

  function compute_max_tocc(data) {
    if (data.tocc !== undefined) return data.tocc
    return Math.max(...data.children.map(compute_max_tocc))
  }
  const max_tocc = compute_max_tocc(data)
  console.error(max_tocc)

  // packing
  const op = {
    'sum_pocc': { init: node => node.data.pocc || 0, inc: (acc, curr) => acc + curr.sum_pocc },
    'sum_tocc': { init: node => node.data.tocc || 0, inc: (acc, curr) => acc + curr.sum_tocc },
    'count': { init: node => node.children ? 0 : 1, inc: (acc, curr) => acc + curr.count },
    'zero_count': { init: node => node.data.tocc === 0 && !node.children ? 1 : 0, inc: (acc, curr) => acc + curr.zero_count },
    'zero_sum': { init: node => node.data.tocc === 0 && !node.children ? node.data.pocc : 0, inc: (acc, curr) => acc + curr.zero_sum },
    'notzero_sum': { init: node => node.data.tocc !== 0 && !node.children ? node.data.pocc : 0, inc: (acc, curr) => acc + curr.notzero_sum },
    'min_tocc': { init: node => node.data.tocc || 0, inc: (acc, curr) => Math.min(acc, curr.min_tocc) },
    'max_tocc': { init: node => node.data.tocc || 0, inc: (acc, curr) => Math.min(acc, curr.max_tocc) },
    ...options.op
  }
  const pack = data => d3.treemap()
    .size([width, height])
    .paddingOuter(3)
    .paddingTop(19)
    .paddingInner(1)
    .round(true)
    (d3.hierarchy(data)
      .eachAfter(function (node) {
        let acc = {}
        for (const key in op) {
          if (op.hasOwnProperty(key)) {
            const element = op[key];
            acc[key] = element.init(node)
          }
        }
        const children = node.children
        let i = children && children.length;
        while (--i >= 0) {
          for (const key in op) {
            if (op.hasOwnProperty(key)) {
              const element = op[key];
              acc[key] = element.inc(acc[key], children[i])
            }
          }
        }
        for (const key in acc) {
          if (acc.hasOwnProperty(key)) {
            const element = acc[key];
            node[key] = element
          }
        }
        node.value = acc['sum_pocc']
      })
      // .sum(d => d.pocc)
      .sort((a, b) => b.value - a.value))

  const root = pack(data);
  let focus = root;
  let view;

  const rescale = x => Math.log1p(x)
  const color = d3.scaleLinear()
    .domain([0, rescale(root.zero_sum/**root.zero_count*//*root.max_tocc*/)])
    .range(["hsl(80,80%,60%)", "hsl(0,80%,40%)"])
    .interpolate(d3.interpolateHsl)
  const color2 = d3.scaleLinear()
    .domain([0, rescale(root.sum_tocc/**root.zero_count*//*root.max_tocc*/)])
    .range(["hsl(90,80%,20%)", "hsl(90,80%,60%)"])
    .interpolate(d3.interpolateHsl)

  const svg = d3.select("div#chart").append('svg')
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("display", "block")
    // .style("margin", "0 -14px")
    .style("cursor", "pointer")
  // .on("click", action);

  let label;

  const prev = {}// display: "none", "fill-opacity": 0, "font-size": "20px", text: '' }

  const format = d3.format(",d")
  const shadow = { id: `O-shadow-507`, href: "https://d3.static.observableusercontent.com/worker/worker.e3faf704bc998c6e3a994e66e24a44614356fd1451db2397ac78dfb58c91af0a.html#O-shadow-507" }//DOM.uid("shadow");
  const node = svg.selectAll("g")
    .data(d3.nest().key(d => d.height).entries(root.descendants()))
    .join("g")
    // .attr("filter", shadow)
    .selectAll("g")
    .data(d => d.values)
    .join("g")
    .attr("transform", d => `translate(${d.x0},${d.y0})`)
  //     .attr("stroke", "#000")
  //     .attr("fill", d => {
  //       return d.zero_sum !== 0 ? color(rescale(d.zero_sum)) : color2(rescale(d.sum_tocc)) //d.min_tocc === 0 ? "red" : 
  //       // return d.children ? color(d.depth) : d.min_tocc === 0 ? "red" : color2(rescale(d.data.tocc))
  //     })
  //     // .attr("pointer-events", d => !d.children ? "none" : null)
  //     .on("mouseover", function (d) {
  //       if (d !== focus && d.depth > focus.depth) {
  //         d3.select(this).attr("stroke-width", 10);
  //         label
  //           .filter(function (d2) { return d2 === d })
  //           .style("display", function (d) { prev.display = this.style.display; return "inline" })
  //           .style("opacity", function (d) { prev["opacity"] = this.style["opacity"]; return 1 })
  //           .style("font-size", function (d) { prev["font-size"] == this.style["font-size"]; return "22.5px" })
  //           .text(function (d) {
  //             prev.text = this.innerHTML
  //             return get_node_value(d)
  //           })
  //       }
  //     })
  //     .on("mouseout", function (d) {
  //       if (d !== focus) {
  //         d3.select(this).attr("stroke-width", 1);
  //         label
  //           .filter(function (d2) { return d2 === d })
  //           .style("display", prev.display)
  //           .style("opacity", prev["opacity"])
  //           .style("font-size", prev["font-size"])
  //           .text(d.data.name)
  //       }
  //       d3.select(this).attr("stroke-width", 1);
  //     })
  //     .on("click", action);

  //   node
  //     .append('svg:title').text(function (d) {
  //       return `${d.data.name}
  // ${d.sum_tocc}/${d.value}
  // d.zero_sum/d.value ${d.zero_sum / d.value}
  // d.zero_sum ${d.zero_sum}
  // d.notzero_sum ${d.notzero_sum}
  // d.zero_sum/d.notzero_sum ${d.zero_sum / d.notzero_sum}
  // d.count ${d.count}`;
  //     });

  // label = svg.append("g")
  //   .style("font-size", "10px")
  //   .attr("pointer-events", "none")
  //   .attr("text-anchor", "middle")
  //   .selectAll("text")
  //   .data(root.descendants())
  //   .join("text")
  //   .style("opacity", d => d.parent === root ? 1 : 0)
  //   .style("display", d => d.parent === root ? "inline" : "none")
  //   .text(d => d.data.name);

  node.append("rect")
    .attr("id", d => (d.nodeUid = { id: `${Math.random() * 100000}-node-${Math.random() * 100000}` }/*DOM.uid("node")*/).id)
    .attr("fill", d => {
      return d.zero_sum !== 0 ? color(rescale(d.zero_sum)) : color2(rescale(d.sum_tocc)) //d.min_tocc === 0 ? "red" : 
    })
    .attr("stroke", "#000")
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .on("mouseover", function (d) {
      if (d !== focus && d.depth > focus.depth) {
        d3.select(this).attr("stroke-width", 10);
        // label
        //   .filter(function (d2) { return d2 === d })
        //   .style("display", function (d) { prev.display = this.style.display; return "inline" })
        //   .style("opacity", function (d) { prev["opacity"] = this.style["opacity"]; return 1 })
        //   .style("font-size", function (d) { prev["font-size"] == this.style["font-size"]; return "22.5px" })
        //   .text(function (d) {
        //     prev.text = this.innerHTML
        //     return get_node_value(d)
        //   })
      }
    })
    .on("mouseout", function (d) {
      if (d !== focus) {
        d3.select(this).attr("stroke-width", 1);
        // label
        //   .filter(function (d2) { return d2 === d })
        //   .style("display", prev.display)
        //   .style("opacity", prev["opacity"])
        //   .style("font-size", prev["font-size"])
        //   .text(d.data.name)
      }
      d3.select(this).attr("stroke-width", 1);
    })
  // .on("click", action);

  node.append("title")
    .text(d => `${d.ancestors().reverse().map(d => d.data.name).join("/")}\n${d.sum_pocc}/${d.sum_tocc}`);

  label = node.append("text")
    .text(d => d.data.name);
  //   .attr("clip-path", d => d.clipUid)
  //   // .style('visibility', 'hidden')
  //   .selectAll("tspan")
  //   .data(d => d.data.name.split(/(?=[A-Z][^A-Z])/g).concat(format(d.value)))
  //   .join("tspan")
  //   .attr("fill-opacity", (d, i, nodes) => i === nodes.length - 1 ? 0.7 : null)
  //   .text(d => d);

  // node.append("clipPath")
  //   .attr("id", d => (d.clipUid = { id: `${Math.random() * 100000}-clip-${Math.random() * 100000}` }/*DOM.uid("clip")*/).id)
  //   .append("use")
  //   .attr("xlink:href", d => d.nodeUid.href);


  // node.filter(d => d.children).selectAll("tspan")
  //   .attr("dx", 3)
  //   .attr("y", 13);

  // node.filter(d => !d.children).selectAll("tspan")
  //   .attr("x", 3)
  //   .attr("y", (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`);

  // zoomTo([root.x0, root.y0, root.x1, root.y1]);
  // zoom(root)

  function zoomTo(v) {
    view = v;

    label.attr("transform", d => `translate(${(d.x - v[0])},${(d.y - v[1])})`);
    node.attr("transform", d => `translate(${(d.x - v[0])},${(d.y - v[1])})`);
    node.attr("x1", d => d.r);
  }

  function zoom(d) {
    const focus0 = focus;

    focus = d;

    const transition = svg.transition()
      .duration(d3.event ? d3.event.altKey ? 7500 : 750 : 750)
      .tween("zoom", () => {
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 * 1.05]);
        return t => zoomTo(i(t));
      });

    label
      .filter(function (d) { return d.parent === focus || d === focus || this.style.display === "inline"; })
      .sort((a, b) => b.value - a.value)
      .transition(transition)
      .style("opacity", d => d.parent === focus ? 1 : 0)
      .on("start", function (d, i) {
        if (d.parent === focus && i < 20) {
          this.style.display = "inline"
        } else if (d === focus) {
          pos_block.innerHTML = get_node_value(d)
        };
      })
      .on("end", function (d) { if (d.parent !== focus) this.style.display = "none"; });
  };

  function action(d = root) {
    // if (d3.event.defaultPrevented) return;
    if (window.moving_mode === 'zoom' && d.children) {
      console.log('zoom', d)
      zoom(d);
      d3.event.stopPropagation()
      console.error(get_node_value(d))
    } else if (window.moving_mode === 'jump to decl') {
      vscode.postMessage({
        command: 'jump to decl',
        position: d.data.path + ':' + d.data.sl + ':' + d.data.sc + ':' + d.data.el + ':' + d.data.ec
      })
      console.log(`go to ${d.data.path + ':' + d.data.sl + ':' + d.data.sc + ':' + d.data.el + ':' + d.data.ec}`);
    } else if (window.moving_mode === 'show context') {
      vscode.postMessage({
        command: 'show context',
        position: d.data.path + ':' + d.data.sl + ':' + d.data.sc + ':' + d.data.el + ':' + d.data.ec
      })
      console.log(`show ${d.data.path + ':' + d.data.sl + ':' + d.data.sc + ':' + d.data.el + ':' + d.data.ec}`);
    }
  }

  {
    const settings = document.createElement('div')
    settings.classList.add('settings')
    settings.style = 'left:0;bottom:0;'
    document.getElementById('settings').appendChild(settings)
    {
      const block = document.createElement('span')
      block.id = 'modeButton'
      block.classList.add("radio-group")
      settings.appendChild(block);
      [{ name: 'zoom in/out', value: 'zoom', checked: true },
      { name: 'jump to declaration', value: 'jump to decl' },
      { name: 'show context', value: 'show context' }]
        .forEach(({ name, value, checked }) => {
          const b = document.createElement('input')
          b.type = 'radio'
          b.name = 'modeButton'
          b.value = value
          b.id = 'radio-' + value.replace(/ /g, '-')
          b.innerHTML = name
          if (checked) { b.toggleAttribute('checked') }
          block.appendChild(b)
          const lab = document.createElement('label')
          lab.setAttribute('for', 'radio-' + value.replace(/ /g, '-'))
          lab.onclick = ""
          lab.innerHTML = name
          block.appendChild(lab)
        })
      window.moving_mode = 'zoom'
      block.onchange = function () {
        block.childNodes.forEach(x => {
          if (x.checked) {
            window.moving_mode = x.value
          }
        }
        )
      }
    }
  }

  return svg.node();
}

const RectDyn = function (data = undefined, options = { op: {}, 'margin-top': '0px', 'margin-bottom': '0px' }) {
  if (data === undefined) {
    if (this.data === undefined) {
      throw 'need data representing the ngrams'
    }
    data = this.data
  } else {
    this.data = data
  }
  let o = {}
  var defaults = {
    margin: { top: 24, right: 0, bottom: 0, left: 0 },
    rootname: "TOP",
    format: ",d",
    title: "",
    width: 960,
    height: 500
  };

  const op = {
    'sum_pocc': { init: node => node.data.pocc || 0, inc: (acc, curr) => acc + curr.sum_pocc },
    'sum_tocc': { init: node => node.data.tocc || 0, inc: (acc, curr) => acc + curr.sum_tocc },
    'count': { init: node => node.children ? 0 : 1, inc: (acc, curr) => acc + curr.count },
    'zero_count': { init: node => node.data.tocc === 0 && !node.children ? 1 : 0, inc: (acc, curr) => acc + curr.zero_count },
    'zero_sum': { init: node => node.data.tocc === 0 && !node.children ? node.data.pocc : 0, inc: (acc, curr) => acc + curr.zero_sum },
    'notzero_sum': { init: node => node.data.tocc !== 0 && !node.children ? node.data.pocc : 0, inc: (acc, curr) => acc + curr.notzero_sum },
    'min_tocc': { init: node => node.data.tocc || 0, inc: (acc, curr) => Math.min(acc, curr.min_tocc) },
    'max_tocc': { init: node => node.data.tocc || 0, inc: (acc, curr) => Math.min(acc, curr.max_tocc) },
    ...options.op
  }

  var treemap = d3.treemap()
    .size([width, height])
    .paddingInner(0)
    .paddingOuter(3)
    .paddingTop(19)
    .round(false);
  var root = treemap(
    d3.hierarchy(data)
      .eachAfter(function (node) {
        let acc = {}
        for (const key in op) {
          if (op.hasOwnProperty(key)) {
            const element = op[key];
            acc[key] = element.init(node)
          }
        }
        const children = node.children
        let i = children && children.length;
        while (--i >= 0) {
          for (const key in op) {
            if (op.hasOwnProperty(key)) {
              const element = op[key];
              acc[key] = element.inc(acc[key], children[i])
            }
          }
        }
        for (const key in acc) {
          if (acc.hasOwnProperty(key)) {
            const element = acc[key];
            node[key] = element
          }
        }
        node.value = acc['sum_pocc']
      })
      .sort((a, b) => b.value - a.value || b.value - a.value)),
    opts = { ...defaults, ...o },
    formatNumber = d3.format(opts.format),
    rname = opts.rootname,
    margin = opts.margin,
    theight = 36 + 16,
    transitioning;

  // d3.select("div#chart")
  //   .attr("width", opts.width)
  //   .attr("height", opts.height)

  // var width = opts.width - margin.left - margin.right,
  //   height = opts.height - margin.top - margin.bottom - theight,
  //   transitioning;

  const rescale = x => Math.log1p(x)
  const color = d3.scaleLinear()
    .domain([0, rescale(root.zero_sum)])
    .range(["hsl(80,80%,60%)", "hsl(0,80%,40%)"])
    .interpolate(d3.interpolateHsl)
  const color2 = d3.scaleLinear()
    .domain([0, rescale(root.sum_tocc/**root.zero_count*//*root.max_tocc*/)])
    .range(["hsl(90,80%,20%)", "hsl(90,80%,60%)"])
    .interpolate(d3.interpolateHsl)

  let x_scale = d3.scaleLinear()
    .domain([0, width])
    .range([0, width]);

  let y_scale = d3.scaleLinear()
    .domain([0, height])
    .range([0, height]);

  // (d3.hierarchy(data)
  //   .sum(d => d.pocc)
  //   .sort((a, b) => b.value - a.value));

  var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.bottom + margin.top)
    .style("margin-left", -margin.left + "px")
    .style("margin.right", -margin.right + "px")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .style("shape-rendering", "crispEdges");

  var grandparent = svg.append("g")
    .attr("class", "grandparent");

  grandparent.append("rect")
    .attr("y", -margin.top)
    .attr("width", width)
    .attr("height", margin.top);

  grandparent.append("text")
    .attr("x", 6)
    .attr("y", 6 - margin.top)
    .attr("dy", ".75em");

  if (opts.title) {
    $("#chart").prepend("<p class='title'>" + opts.title + "</p>");
  }

  console.log(root);
  initialize(root);
  accumulate(root); // TODO modified
  // layout(root);
  console.log(root);
  display(root);

  if (window.parent !== window) {
    var myheight = document.documentElement.scrollHeight || document.body.scrollHeight;
    window.parent.postMessage({ height: myheight }, '*');
  }

  function initialize(root) {
    root.x0 = root.y0 = root.x = root.y = 0;
    root.dx = width;
    root.dy = height;
    root.x1 = root.x + root.dx;
    root.y1 = root.y + root.dy;
    root.depth = 0;
  }

  // Aggregate the values for internal nodes. This is normally done by the
  // treemap layout, but not here because of our custom implementation.
  // We also take a snapshot of the original children (_children) to avoid
  // the children being overwritten when when layout is computed.
  function accumulate(d) {
    // return (d._children = d.children)
    //   ? d.value = d.children.reduce(function (p, v) { return p + accumulate(v); }, 0)
    //   : d.value;
    d._children = d.children;
    return d.value
  }

  // Compute the treemap layout recursively such that each group of siblings
  // uses the same size (1×1) rather than the dimensions of the parent cell.
  // This optimizes the layout for the current zoom state. Note that a wrapper
  // object is created for the parent node for each group of siblings so that
  // the parent’s dimensions are not discarded as we recurse. Since each group
  // of sibling was laid out in 1×1, we must rescale to fit using absolute
  // coordinates. This lets us use a viewport to zoom.
  function layout(d) {
    if (d._children) {
      // root.nodes({ _children: d._children });
      d._children.forEach(function (c) {
        c.x0 = c.x = d.x + c.x * d.dx;
        c.y0 = c.y = d.y + c.y * d.dy;
        c.dx *= d.dx;
        c.dy *= d.dy;
        c.x1 = c.x + c.dx;
        c.y1 = c.y + c.dy;
        c.parent = d;
        layout(c);
      });
    }
  }

  function display(d) {
    grandparent
      .datum(d.parent)
      .on("click", transition)
      .select("text")
      .text(name(d));

    var g1 = svg.insert("g", ".grandparent")
      .datum(d)
      .attr("class", "depth");

    var g = g1.selectAll("g")
      .data(d.children)
      .enter()
      .append("g");

    // add class and click handler to all g's with children
    g.filter(function (d) {
      return d.children;
    })
      .classed("children", true)
      .on("click", transition);
    g.selectAll(".child")
      .data(function (d) {
        return d.children || [d];
      })
      .enter().append("rect")
      .attr("class", "child")
      .call(rect);
    // add title to parents
    g.append("rect")
      .attr("class", "parent")
      .call(rect)
      .append("title")
      .text(function (d) {
        return d.data.name;
      });
    // /* Adding a foreign object instead of a text object, allows for text wrapping */
    g.append("foreignObject")
      .attr("width", function (d) { console.log(1, d.x0, d); return x_scale(d.x + d.dx) - x_scale(d.x); })
      .call(rect)
      .attr("class", "foreignobj")
      .append("xhtml:div")
      .attr("dy", ".75em")
      .html(function (d) {
        return '' +
          '<p class="title"> ' + d.data.name + '</p>' +
          '<p>' + formatNumber(d.value) + '</p>'
          ;
      })

    function transition(d) {
      if (transitioning || !d) return;
      transitioning = true;
      var g2 = display(d),
        t1 = g1.transition().duration(650),
        t2 = g2.transition().duration(650);
      // Update the domain only after entering new elements.
      x_scale.domain([d.x0, d.x1]);
      y_scale.domain([d.y0, d.y1]);
      // Enable anti-aliasing during the transition.
      svg.style("shape-rendering", null);
      // Draw child nodes on top of parent nodes.
      svg.selectAll(".depth").sort(function (a, b) {
        return a.depth - b.depth;
      });
      // Fade-in entering text.
      g2.selectAll("text").style("fill-opacity", 0);
      g2.selectAll("foreignObject div").style("display", "none");
      /*added*/
      // Transition to the new view.
      t1.selectAll("text").call(text).style("fill-opacity", 0);
      t2.selectAll("text").call(text).style("fill-opacity", 1);
      t1.selectAll("rect").call(rect);
      t2.selectAll("rect").call(rect);
      /* Foreign object */
      t1.selectAll(".textdiv").style("display", "none");
      /* added */
      t1.selectAll(".foreignobj").call(foreign);
      /* added */
      t2.selectAll(".textdiv").style("display", "block");
      /* added */
      t2.selectAll(".foreignobj").call(foreign);
      /* added */
      // Remove the old node when the transition is finished.
      t1.on("end.remove", function () {
        this.remove();
        transitioning = false;
      });
    }

    return g;
  }

  function text(text) {
    text.selectAll("tspan")
      .attr("x", function (d) { return x_scale(d.x) + 6; })
    text.attr("x", function (d) { return x_scale(d.x) + 6; })
      .attr("y", function (d) { return y_scale(d.y) + 6; })
      .style("opacity", function (d) { return this.getComputedTextLength() < x_scale(d.x + d.dx) - x_scale(d.x) ? 1 : 0; });
  }

  function text2(text) {
    text.attr("x", function (d) { return x_scale(d.x + d.dx) - this.getComputedTextLength() - 6; })
      .attr("y", function (d) { return y_scale(d.y + d.dy) - 6; })
      .style("opacity", function (d) { return this.getComputedTextLength() < x_scale(d.x + d.dx) - x_scale(d.x) ? 1 : 0; });
  }

  function rect(d) {
    d
      .attr("x", function (d) {
        console.log(d);
        return x_scale(d.x0);
      })
      .attr("y", function (d) {
        return y_scale(d.y0);
      })
      .attr("width", function (d) {
        return x_scale(d.x1) - x_scale(d.x0);
      })
      .attr("height", function (d) {
        return y_scale(d.y1) - y_scale(d.y0);
      })
      .attr("fill", function (d) {
        return d.zero_sum !== 0 ? color(rescale(d.zero_sum)) : color2(rescale(d.sum_tocc)) //d.min_tocc === 0 ? "red" : 
      });
  }

  function foreign(foreign) { /* added */
    foreign
      .attr("x", function (d) {
        return x_scale(d.x0);
      })
      .attr("y", function (d) {
        return y_scale(d.y0);
      })
      .attr("width", function (d) {
        return x_scale(d.x1) - x_scale(d.x0);
      })
      .attr("height", function (d) {
        return y_scale(d.y1) - y_scale(d.y0);
      });
  }

  function name(d) {
    return path(d) +
      (d.parent
        ? " -  Click to zoom out"
        : " - Click inside square to zoom in");
  }

  function path(d) {
    return d.parent
      ? path(d.parent) + " / " + d.data.name + " (" + formatNumber(d.value) + ")"
      : d.data.name + " (" + formatNumber(d.value) + ")";
  }
  function breadcrumbs(d) {
    var res = "";
    var sep = " > ";
    d.ancestors().reverse().forEach(function (i) {
      res += i.data.name + sep;
    });
    return res
      .split(sep)
      .filter(function (i) {
        return i !== "";
      })
      .join(sep);
  }
}

const RectCustom = function (data = undefined, options = { op: {}, 'margin-top': '0px', 'margin-bottom': '0px', paddingTop: 20 }) {
  if (data === undefined) {
    if (this.data === undefined) {
      throw 'need data representing the ngrams'
    }
    data = this.data
  } else {
    this.data = data
  }
  // path to current node

  const pos_block = document.createElement('div')
  pos_block.classList.add('no-print')
  {
    pos_block.innerHTML = 'path to current node'
    document.getElementById('settings').insertAdjacentElement('beforebegin', pos_block)
    document.getElementById('settings').setAttribute('style', "top:30px;")
  }
  const op = {
    'sum_pocc': { init: node => node.data.pocc || 0, inc: (acc, curr) => acc + curr.sum_pocc },
    'sum_tocc': { init: node => node.data.tocc || 0, inc: (acc, curr) => acc + curr.sum_tocc },
    'count': { init: node => node.children ? 0 : 1, inc: (acc, curr) => acc + curr.count },
    'zero_count': { init: node => node.data.tocc === 0 && !node.children ? 1 : 0, inc: (acc, curr) => acc + curr.zero_count },
    'zero_sum': { init: node => node.data.tocc === 0 && !node.children ? node.data.pocc : 0, inc: (acc, curr) => acc + curr.zero_sum },
    'notzero_sum': { init: node => node.data.tocc !== 0 && !node.children ? node.data.pocc : 0, inc: (acc, curr) => acc + curr.notzero_sum },
    'min_tocc': { init: node => node.data.tocc || 0, inc: (acc, curr) => Math.min(acc, curr.min_tocc) },
    'max_tocc': { init: node => node.data.tocc || 0, inc: (acc, curr) => Math.min(acc, curr.max_tocc) },
    ...options.op
  }
  const processed_data = d3.hierarchy(data)
    .eachAfter(function (node) {
      let acc = {}
      for (const key in op) {
        if (op.hasOwnProperty(key)) {
          const element = op[key];
          acc[key] = element.init(node)
        }
      }
      const children = node.children
      let i = children && children.length;
      while (--i >= 0) {
        for (const key in op) {
          if (op.hasOwnProperty(key)) {
            const element = op[key];
            acc[key] = element.inc(acc[key], children[i])
          }
        }
      }
      for (const key in acc) {
        if (acc.hasOwnProperty(key)) {
          const element = acc[key];
          node[key] = element
        }
      }
      node.value = acc['sum_pocc']
    })
    // .sum(d => d.pocc)
    .sort((a, b) => b.value - a.value)

  const packing = d3.treemap()
    .size([width, height])
    .paddingOuter(3)
    // .paddingTop(options.paddingTop)
    // .paddingInner(1)
    .round(true)

  const root = packing(processed_data)

  const svg = d3.select("div#chart").append('svg')
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("display", "block")
    .style("margin", "10px")
    .style("cursor", "pointer")

  const rescale = x => Math.log1p(x)
  const color = d3.scaleLinear()
    .domain([0, rescale(root.zero_sum/**root.zero_count*//*root.max_tocc*/)])
    .range(["hsl(80,80%,60%)", "hsl(0,80%,40%)"])
    .interpolate(d3.interpolateHsl)
  const color2 = d3.scaleLinear()
    .domain([0, rescale(root.sum_tocc/**root.zero_count*//*root.max_tocc*/)])
    .range(["hsl(90,80%,20%)", "hsl(90,80%,60%)"])
    .interpolate(d3.interpolateHsl)
  let x_scale = d3.scaleLinear()
    .domain([0, width])
    .range([0, width]);

  let y_scale = d3.scaleLinear()
    .domain([0, height])
    .range([0, height]);


  function f(parentLists) {
    const rect = parentLists.append('rect')
      .classed("rect", true)
      .attr("x", function (d) { return x_scale(d.x0); })
      .attr("y", function (d) { return y_scale(d.y0); })
      .attr("width", function (d) { return x_scale(d.x1) - x_scale(d.x0); })
      .attr("height", function (d) { return y_scale(d.y1) - y_scale(d.y0); })
      .attr("stroke", "#000")
      .attr("fill", function (d) {
        return d.zero_sum !== 0 ? color(rescale(d.zero_sum)) : color2(rescale(d.sum_tocc)) //d.min_tocc === 0 ? "red" : 
      })
      .on("click", action);
    const text = parentLists.append('text')
      .text(function (d) { return d.data.name; })
      .attr("x", function (d) { return x_scale(d.x0 + 3); })
      .attr("y", function (d) { return y_scale(d.y0 + options.paddingTop - 2); })
      .style("cursor", "pointer")
      .style('display', function (d) {
        const bBox = this.getBBox();
        console.log(this.getBBox(), d)
        return bBox.width + 3 > (d.x1 - d.x0) || bBox.height + 2 > (d.y1 - d.y0) ? 'none' : 'inherit'
      });
    const title = parentLists.append('title')
      .text(function (d) { return d.data.name; });
    const children = parentLists.selectAll('g')
      .data(function (d) {
        return d.children || []
      })
      .enter().append('g');
    if (!children.empty()) {
      f(children);
    }
  }
  const root_rect = svg
    .selectAll('g').data([processed_data])
    .enter().append('g');
  f(root_rect)
  let focus = root;
  let view = { x0: focus.x0, y0: focus.y0, x1: focus.x1, y1: focus.y1 };
  console.log(root)
  zoom(root);

  function action(d) {
    zoom(d);
    d3.event.stopPropagation()
  }

  function zoomTo(v) {
    // console.log(v,view)
    const xratio = width / (v.x1 - v.x0);
    const yratio = height / (v.y1 - v.y0);
    console.log(xratio, yratio)
    d3.selectAll('.rect')
      .attr("width", d => (d.x1 - d.x0) * xratio)
      .attr("x", d => (d.x0 - view.x0) * xratio)
      .attr("height", d => (d.y1 - d.y0) * yratio)
      .attr("y", d => (d.y0 - view.y0) * yratio)

  }

  function zoom(d) {
    const focus0 = focus;

    focus = d;

    const transition = svg.transition()
      .duration(d3.event ? d3.event.altKey ? 7500 : 750 : 750)
      .tween("zoom", () => {
        const i = d3.interpolateObject(view, { x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1 })
        view = { x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1 };
        return t => zoomTo(i(t));
      });

    // label
    //   .filter(function (d) { return d.parent === focus || d === focus || this.style.display === "inline"; })
    //   .sort((a, b) => b.value - a.value)
    //   .transition(transition)
    //   .style("opacity", d => d.parent === focus ? 1 : 0)
    //   .on("start", function (d, i) {
    //     if (d.parent === focus && i < 20) {
    //       this.style.display = "inline"
    //     } else if (d === focus) {
    //       console.log('get_node_value', d)
    //       pos_block.innerHTML = get_node_value(d)
    //     };
    //   })
    //   .on("end", function (d) { if (d.parent !== focus) this.style.display = "none"; });
  };
  // const node = svg
  //   .data(root.descendants())
  //   .append("rect")
  //   .attr("x", function (d) { return x_scale(d.x0); })
  //   .attr("y", function (d) { return y_scale(d.y0); })
  //   .attr("width", function (d) { return x_scale(d.x1) - x_scale(d.x0); })
  //   .attr("height", function (d) { return y_scale(d.y1) - y_scale(d.y0); })
  //   .attr("fill", function (d) {
  //     return d.zero_sum !== 0 ? color(rescale(d.zero_sum)) : color2(rescale(d.sum_tocc)) //d.min_tocc === 0 ? "red" : 
  //   });

}

function get_node_value(data) {
  if (data.params) {
    return get_node_value(data.parent)
  } else if (!data.children || data.children[0].params) {
    return get_node_value(data.parent) + ':' + data.sl + ':' + data.sc + ':' + data.el + ':' + data.ec
  } else if (data.parent && data.parent.parent) {
    return get_node_value(data.parent) + '/' + data.name
  } else {
    return data.name
  }
  // return !data.children || data.children.params ?
  //   data.params || data.name + ':' + data.sl + ':' + data.sc
  //   : data.parent ?
  //     (get_node_value(data.parent) + '/' + data.name)
  //     : 'gutenberg'
}

function vscode_action(data) {
  if (window.moving_mode === 'zoom' && data.children) {
    console.log('zoom', data)
    return 'zoom'
  } else {
    const position = get_node_value(data)
    if (window.moving_mode === 'jump to decl') {
      vscode.postMessage({
        command: 'jump to decl',
        position: position,
        parameter: data.params,
        type: data.params ? 'params' : data.sl ? 'function' : 'container'
      })
      console.log(`go to ${position}`);
    } else if (window.moving_mode === 'show context') {
      vscode.postMessage({
        command: 'show context',
        parameter: data.params,
        position: position,
        type: data.params ? 'params' : data.sl ? 'function' : 'container'
      })
      console.log(`show ${position}, ${data.params}`);
    }
  }
}
const basic_accumulators_exe_order = [
  'max depth',
  'count',
  'count ignore params',
  'min tocc',
  'max tocc',
  'sum pocc',
  'sum tocc',
  'zero tocc count',
  'zero tocc sum',
  'not zero tocc sum',
  'count production ignore params',
  'zero sum tocc ignore params',
  'zero count tocc ignore params',]

const basic_accumulators = {
  'max depth': {
    init: data => 0,
    inc: (acc, curr) => Math.max(acc, ...(curr.map(x => x['max depth']))) + 1
  },
  'count': {
    init: data => data.children ? 0 : 1,
    inc: (acc, curr) => curr.reduce((acc, x) => acc + x['count'], acc)
  },
  'count ignore params': {
    init: data => data.children && data.children[0] && data.children[0].params ? 1 : data.children ? 1 : 0,
    inc: (acc, curr) => curr[0] && curr[0].params ? acc : curr.reduce((acc, x) => acc + x['count ignore params'], acc)
  },
  'min tocc': {
    init: data => data.tocc || 0,
    inc: (acc, curr) => Math.min(acc, ...curr.map(x => x['min tocc']))
  },
  'max tocc': {
    init: data => data.tocc || 0,
    inc: (acc, curr) => Math.max(acc, ...curr.map(x => x['max tocc']))
  },
  'sum pocc': {
    init: data => data.pocc || 0,
    inc: (acc, curr) => curr.reduce((acc, x) => acc + x['sum pocc'], acc)
  },
  'sum tocc': {
    init: data => data.tocc || 0,
    inc: (acc, curr) => curr.reduce((acc, x) => acc + x['sum tocc'], acc)
  },
  'zero tocc count': {
    init: data => data.tocc === 0 && !data.children ? 1 : 0,
    inc: (acc, curr) => curr.reduce((acc, x) => acc + x['zero tocc count'], acc)
  },
  'zero tocc sum': {
    init: data => data.tocc === 0 && !data.children ? data.pocc : 0,
    inc: (acc, curr) => curr.reduce((acc, x) => acc + x['zero tocc sum'], acc)
  },
  'not zero tocc sum': {
    init: data => data.tocc !== 0 && !data.children ? data.pocc : 0,
    inc: (acc, curr) => curr.reduce((acc, x) => acc + x['not zero tocc sum'], acc)
  },
  'zero sum tocc ignore params': {
    init: data => data.children && data.children[0] && data.children[0].params ? (data['sum tocc'] === 0 ? data['sum pocc'] : 0) : (data['sum tocc'] === 0 && !data.children ? data['sum pocc'] : 0),
    inc: (acc, curr) => curr[0] && curr[0].params ? acc : curr.reduce((acc, x) => acc + x['zero sum tocc ignore params'], acc)
  },
  'zero count tocc ignore params': {
    init: data => data.children && data.children[0] && data.children[0].params ? (data['sum tocc'] === 0 ? 1 : 0) : (!data.children && data['sum tocc'] === 0 ? 1 : 0),
    inc: (acc, curr) => curr[0] && curr[0].params ? acc : curr.reduce((acc, x) => acc + x['zero count tocc ignore params'], acc)
  },
  'count production ignore params': {
    init: data => data.children && data.children[0] && data.children[0].params ? (data['sum pocc'] > 0 ? 1 : 0) : (!data.children && data['sum pocc'] > 0 ? 1 : 0),
    inc: (acc, curr) => curr[0] && curr[0].params ? acc : curr.reduce((acc, x) => acc + x['count production ignore params'], acc)
  }
}

// Does not keep scale in nodes, can't compare scale of nodes only leafs
const CircleTrue = function (data = undefined, options = { op: {} }) {
  if (data === undefined) {
    if (this.data === undefined) {
      throw 'need data representing the ngrams'
    }
    data = this.data
  } else {
    this.data = data
  }
  document.getElementById('chart').innerHTML = ''

  // path to current node
  const pos_block = document.getElementById('curr_path') || document.createElement('div')
  pos_block.id = 'curr_path'
  pos_block.style.top = '0'
  pos_block.style.zIndex = '150'
  pos_block.style.backgroundColor = 'white'
  pos_block.style.position = 'sticky'
  pos_block.classList.add('no-print')
  {
    pos_block.innerHTML = pos_block.innerHTML || 'path to current node'
    document.getElementById('settings').insertAdjacentElement('beforebegin', pos_block)
    document.getElementById('settings').setAttribute('style', "top:30px;")
  }

  function compute_max_tocc(data) {
    if (data.tocc !== undefined) return data.tocc
    return Math.max(...data.children.map(compute_max_tocc))
  }
  const max_tocc = compute_max_tocc(data)
  console.error(max_tocc)

  const height = Math.min(window.innerWidth, window.innerHeight);
  const width = height

  settings_register.comp_nodes_sizes
  const op = {
    ...basic_accumulators
  }
  settings_register.color_gradients.forEach(x => {

    op[x.acc_name.value] = x.acc_fct.innerHTML.trim() === '' ?
      op[x.acc_name.value] || ({ init: x => NaN, inc: (x, y) => NaN })
      : (basic_accumulators_exe_order.push(x.acc_name.value), new Function('return (' + x.acc_fct.value + ')'))()
  })
  const pack = data => d3.pack()
    .size([width, height])
    .padding(3)
    (d3.hierarchy(data)
      .eachAfter(function (node) {
        // TODO put parent
        for (const key of basic_accumulators_exe_order) {
          if (op.hasOwnProperty(key)) {
            const element = op[key];
            node.data[key] = element.inc(element.init(node.data), (node.data.children || []).filter(x => x.value > 0 || (!x.children && x.params)))
          }
        }
        node.value = node.data[settings_register.comp_nodes_sizes.name.value]
      })
      // .sum(d => d.pocc)
      .sort((a, b) => b.value - a.value))

  const root = pack(data);
  let focus = root;
  let view;

  const rescale = x => Math.log1p(x)
  const colors = settings_register.color_gradients.map(({ cond, c1, c2, scale, acc_name, acc_fct }) => {
    const c = d3.scaleLinear()
      .domain([0, rescale(root.data[acc_name.value])])
      .range([c1.value, c2.value])
      .interpolate(d3.interpolateHsl)
    scale([1, root.data[acc_name.value]]);
    return { cond: ((Function('return (' + cond.value + ')'))()), color: data => c(rescale(data[acc_name.value])) }
  })
  // const color = d3.scaleLinear()
  //   .domain([0, rescale(root.zero_sum/**root.zero_count*//*root.max_tocc*/)])
  //   .range(["hsl(80,80%,60%)", "hsl(0,80%,40%)"])
  //   .interpolate(d3.interpolateHsl)
  // const color2 = d3.scaleLinear()
  //   .domain([0, rescale(root.sum_tocc/**root.zero_count*//*root.max_tocc*/)])
  //   .range(["hsl(90,80%,20%)", "hsl(90,80%,60%)"])
  //   .interpolate(d3.interpolateHsl)


  const svg = d3.select("div#chart").append('svg')
    .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
    .attr("width", width)
    .style("display", "block")
    // .style("margin", "0 -14px")
    .style("cursor", "pointer")
  // .on("click", action);

  let label;

  const prev = {}// display: "none", "fill-opacity": 0, "font-size": "20px", text: '' }

  const node = svg.append("g")
    .selectAll("circle")
    .data(root.descendants().slice(1))
    .join("circle")
    .attr("stroke", "#000")
    .attr("fill", d => {
      {
        let i = 0
        while (i < colors.length) {
          if (colors[i].cond(d.data)) {
            return colors[i].color(d.data)
          }
          i++
        }
      }
      // return d.zero_sum !== 0 ? color(rescale(d.zero_sum)) : color2(rescale(d.sum_tocc)) //d.min_tocc === 0 ? "red" : 
      // return d.children ? color(d.depth) : d.min_tocc === 0 ? "red" : color2(rescale(d.data.tocc))
    })
    // .attr("pointer-events", d => !d.children ? "none" : null)
    .on("mouseover", function (d) {
      if (d !== focus && d.depth > focus.depth) {
        d3.select(this).attr("stroke-width", 10);
        label
          .filter(function (d2) { return d2 === d })
          .style("display", function (d) { prev.display = this.style.display; return "inline" })
          .style("opacity", function (d) { prev["opacity"] = this.style["opacity"]; return 1 })
          .style("font-size", function (d) { prev["font-size"] == this.style["font-size"]; return "22.5px" })
          .text(function (d) {
            prev.text = this.innerHTML
            return get_node_value(d.data)
          })
      }
    })
    .on("mouseout", function (d) {
      if (d !== focus) {
        d3.select(this).attr("stroke-width", 1);
        label
          .filter(function (d2) { return d2 === d })
          .style("display", prev.display)
          .style("opacity", prev["opacity"])
          .style("font-size", prev["font-size"])
          .text(d.data.name)
      }
      d3.select(this).attr("stroke-width", 1);
    })
    .on("click", action);

  node
    .append('svg:title').text(function (d) {
      return `${d.data.name}
${d.data['sum pocc']}/${d.data['sum tocc']}
d.data['zero tocc sum']/d.data['sum pocc'] ${d.data['zero tocc sum'] / d.data['sum pocc']}
d.data['zero tocc sum'] ${d.data['zero tocc sum']}
d.data['not zero tocc sum'] ${d.data['not zero tocc sum']}
d.data['zero tocc sum']/d.data['not zero tocc sum'] ${d.data['zero tocc sum'] / d.data['not zero tocc sum']}
d.data['count'] ${d.data['count']}`;
    });


  label = svg.append("g")
    .style("font-size", "10px")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .selectAll("text")
    .data(root.descendants())
    .join("text")
    .style("opacity", d => d.parent === root ? 1 : 0)
    .style("display", d => d.parent === root ? "inline" : "none")
    .text(d => d.data.name);

  zoomTo([root.x, root.y, root.r * 2 * 1.05]);
  zoom(root)

  function zoomTo(v) {
    const k = width / v[2];

    view = v;

    label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("r", d => d.r * k);
  }

  function zoom(d) {
    const focus0 = focus;

    focus = d;

    const transition = svg.transition()
      .duration(d3.event ? d3.event.altKey ? 7500 : 750 : 750)
      .tween("zoom", () => {
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 * 1.05]);
        return t => zoomTo(i(t));
      });

    label
      .filter(function (d) { return d.parent === focus || d === focus || this.style.display === "inline"; })
      .sort((a, b) => b.value - a.value)
      .transition(transition)
      .style("opacity", d => d.parent === focus ? 1 : 0)
      .on("start", function (d, i) {
        if (d.parent === focus && i < 20) {
          this.style.display = "inline"
        } else if (d === focus) {
          pos_block.innerHTML = get_node_value(d.data)
        };
      })
      .on("end", function (d) { if (d.parent !== focus) this.style.display = "none"; });
  };

  function action(d = root) {
    d3.event.stopPropagation()
    if (vscode_action(d.data) === 'zoom') zoom(d)
  }

  return svg.node();
}
// Keep scale in nodes
const PartitionCustom = function (data = undefined, options = { 'margin-top': '0px', 'margin-bottom': '0px', paddingTop: 20 }, reset = false) {
  if (data === undefined) {
    if (this.data === undefined) {
      throw 'need data representing the ngrams'
    }
    data = this.data
  } else {
    this.data = data
    reset = true
  }
  // path to current node
  const pos_block = document.getElementById('curr_path') || document.createElement('div')
  pos_block.id = 'curr_path'
  pos_block.style.top = '0'
  pos_block.style.zIndex = '150'
  pos_block.style.backgroundColor = 'white'
  pos_block.style.color = 'black'
  pos_block.style.position = 'sticky'
  pos_block.classList.add('no-print')
  {
    pos_block.innerHTML = pos_block.innerHTML || 'path to current node'
    document.getElementById('settings').insertAdjacentElement('beforebegin', pos_block)
    document.getElementById('settings').setAttribute('style', "top:30px;")
  }
  const op = {
    ...basic_accumulators
  }
  {
    const x = settings_register.comp_nodes_sizes
    op[x.name.value] = x.acc_fct.value.trim() === '' ?
      op[x.name.value] || ({ init: x => NaN, inc: (x, y) => NaN })
      : (op[x.name.value] || basic_accumulators_exe_order.push(x.name.value),
        new Function('return (' + x.acc_fct.value + ')'))();
  }
  settings_register.color_gradients.forEach(x => {
    op[x.acc_name.value] = x.acc_fct.innerHTML.trim() === '' ?
      op[x.acc_name.value] || ({ init: x => NaN, inc: (x, y) => NaN })
      : (op[x.acc_name.value] || basic_accumulators_exe_order.push(x.acc_name.value),
        new Function('return (' + x.acc_fct.value + ')'))()
  })
  function process_data(data, f, depth = 0) {
    data.children && data.children.forEach(x => {
      x.parent = data;
      process_data(x, f, depth + 1)
    })
    data.depth = depth
    f(data)
  }

  process_data(data, function (data) {
    for (const key of basic_accumulators_exe_order) {
      if (op.hasOwnProperty(key)) {
        const element = op[key];
        data[key] = element.inc(element.init(data), (data.children || []).filter(x => x.value > 0 || (!x.children && x.params)))
      }
    }
    data.value = data[settings_register.comp_nodes_sizes.name.value]
  })
  // .sum(d => d.pocc)
  // .sort((a, b) => b.value - a.value)

  const rescale = x => Math.log2(x)

  const colors = settings_register.color_gradients.map(({ cond, c1, c2, scale, acc_name, acc_fct }) => {
    const c = d3.scaleLinear()
      .domain([0, rescale(data[acc_name.value])])
      .range([c1.value, c2.value])
      .interpolate(d3.interpolateHsl)
    scale([1, data[acc_name.value]]);
    return { cond: ((Function('return (' + cond.value + ')'))()), color: data => c(rescale(data[acc_name.value])) }
  })

  // const color = d3.scaleLinear()
  //   .domain([0, rescale(data.zero_sum/**root.zero_count*//*root.max_tocc*/)])
  //   .range(["hsl(70,80%,60%)", "hsl(0,80%,40%)"])
  //   .interpolate(d3.interpolateHsl)
  // const color2 = d3.scaleLinear()
  //   .domain([0, rescale(data.sum_tocc/**root.zero_count*//*root.max_tocc*/)])
  //   .range(["hsl(90,80%,20%)", "hsl(90,80%,60%)"])
  //   .interpolate(d3.interpolateHsl)

  let vis_depth = parseInt(settings_register.visible_depth.value)
  // let col_width = window.innerWidth / (data.max_depth-vis_depth)
  col_width = window.innerWidth / (vis_depth - data.depth) - 4

  let height_expansion = settings_register.number1.value / data.value
  const root = data
  function render(data, node, depth = 0) {
    const curr_div = document.createElement('div')
    curr_div.style.height = `${data.value * height_expansion}px`
    {
      let i = 0
      while (i < colors.length) {
        if (colors[i].cond(data)) {
          curr_div.style.backgroundColor = colors[i].color(data)
          break
        }
        i++
      }
    }
    // data.zero_sum !== 0 ?
    //   color(rescale(data.zero_sum))
    //   : color2(rescale(data.sum_tocc))
    curr_div.classList.add('node')
    // if(!data.parent) curr_div.style.display = 'block'
    const title = document.createElement('div')
    // TODO use not zero count ignore params
    title.innerHTML = `<p><strong>${data['sum pocc']}</strong> <em>calls in production</em></p>
<p><strong>${data['sum tocc']}</strong> <em>calls in tests</em></p>
<p><strong>${data['zero sum tocc ignore params']}</strong> <em>calls to never tested functions</em></p>
<p><strong>${data['count production ignore params']}</strong> <em>functions were used in production</em></p>
<p><strong>${data['zero count tocc ignore params']}</strong> <em>functions were not tested</em></p>`
    {
      const tmp = document.createElement('p')
      tmp.innerText = data.name
      title.prepend(tmp)
    }
    curr_div.append(title)
    const tooltip = document.createElement('p')
    tooltip.innerText = data.name
    tooltip.innerHTML += `</br>
${data['sum pocc']} calls in production</br>
${data['sum tocc']} calls in tests</br>
${data['zero sum tocc ignore params']} calls in production that are never tested`
    tooltip.classList.add('tooltip')
    curr_div.addEventListener('mouseenter', function (ev) {
      ev.stopPropagation()
      tooltip.style.visibility = 'visible'
      if (this.parentElement.id !== 'chart') {
        this.parentElement.parentElement.children.item(1).style.visibility = 'hidden'
      }
      {
        const tmp = ev.clientY - 20, tmp1 = window.innerHeight - 20;
        tooltip.style.top = (tmp + 80 > tmp1 ? tmp1 - 80 : tmp) + 'px';
      }
      {
        const tmp = ev.clientX, tmp1 = window.innerWidth;
        tooltip.style.left = (tmp + 120 > tmp1 ? tmp1 - 120 : tmp)/*(width - (data.max_depth * col_width))*/ + 'px'
      }
    })
    // curr_div.addEventListener('mousemove', function (ev) {
    //   ev.stopPropagation()
    // {
    //   const tmp = ev.clientY- 20, tmp1 = window.innerHeight-20;
    //   tooltip.style.top = (tmp + 80 > tmp1 ? tmp1 - 80 : tmp) + 'px';
    // }
    // {
    //   const tmp = ev.clientX, tmp1 = window.innerWidth;
    //   tooltip.style.left = (tmp + 120 > tmp1 ? tmp1 - 120 : tmp)/*(width - (data.max_depth * col_width))*/ + 'px'
    // }
    // })
    curr_div.addEventListener('mouseleave', function (ev) {
      tooltip.style.visibility = 'hidden'
      if (this.parentElement.id !== 'chart') {
        const e = this.parentElement.parentElement.children.item(1)
        e.style.visibility = 'visible'
        {
          const tmp = ev.clientY - 20, tmp1 = window.innerHeight - 20;
          e.style.top = (tmp + 80 > tmp1 ? tmp1 - 80 : tmp) + 'px';
        }
        {
          const tmp = ev.clientX, tmp1 = window.innerWidth;
          e.style.left = (tmp + 120 > tmp1 ? tmp1 - 120 : tmp)/*(width - (data.max_depth * col_width))*/ + 'px'
        }
      }
    })

    curr_div.append(tooltip)
    const content = document.createElement('span')
    curr_div.append(content)
    function shrink(e) {
      e.style.height = '100%'
      // e.style.width = `${1000}px`;
      setTimeout(function () {
        e.children.item(0).style.display = 'block';
        e.children.item(0).style.width = '100%';
        e.children.item(2).style.width = '-webkit-fill-available'//'100%';
      }, 1000);
      [...e.parentElement.children].forEach(x => {
        if (e !== x) {
          x.style.height = '0px'
          setTimeout(function () {
            x.style.display = 'none'
          }, 1500);
        }
      })
      if (e.parentElement.id !== 'chart') {
        shrink(e.parentElement.parentElement)
      }
    }
    function unshrink(e, d, h) {
      if (root['max depth'] - vis_depth <= 3) {
        if (d.parent && d.parent['max depth'] <= (root['max depth'] - vis_depth) + 1) {
          e.style.display = 'none'
          return
        }
      } else {
        if (d.depth - data.depth > vis_depth) {
          e.style.display = 'none'
          return
        }
        if (d.parent && d.parent['max depth'] <= 3 + 1) {
          e.style.display = 'none'
          return
        }
      }
      e.style.display = 'block'
      e.children.item(0).style.display = 'inline-grid';
      e.children.item(2).style.width = null;
      [...e.children.item(2).children].forEach((x, i) => {
        x.style.display = 'block'
        // x.style.width = null
        x.children.item(0).style.width = `${col_width}px`;
        x.style.height = `${d.children[i].value * h}px`;
        unshrink(x, d.children[i], h)
      })
    }

    curr_div.addEventListener('click', function (ev) {
      ev.stopPropagation()
      if (vscode_action(data) === 'zoom') {
        PartitionCustom.focused = [curr_div, data];
        pos_block.innerHTML = get_node_value(data)
        vis_depth = parseInt(settings_register.visible_depth.value)
        // col_width = window.innerWidth / (data['max depth']-vis_depth)
        if (root['max depth'] - vis_depth <= 3) {
          col_width = window.innerWidth / (data['max depth'] - 1 - (root['max depth'] - vis_depth)) - 4
        } else {
          col_width = window.innerWidth / (vis_depth - data.depth) - 4
        }
        height_expansion = (settings_register.number1.value - 20 * data.depth) / data.value
        unshrink(curr_div, data, height_expansion)
        shrink(curr_div)
      }
    })
    node.append(curr_div)
    if (data.children)
      data.children
        .forEach(x =>
          render(x, content, depth + 1))
  }
  function refresh(data, curr_div, depth = 0) {
    if (curr_div.style.height !== '100%' && curr_div.style.height !== '0px')
      curr_div.style.height = `${data.value * height_expansion}px`
    {
      let i = 0
      while (i < colors.length) {
        if (colors[i].cond(data)) {
          curr_div.style.backgroundColor = colors[i].color(data)
          break
        }
        i++
      }
    }
    // const title = curr_div.children.item(0)
    // const tooltip = curr_div.children.item(1)
    const content = curr_div.children.item(2)
    data.children && data.children.map((x, i) =>
      refresh(x, content.children.item(i), depth + 1))
  }
  // settings_register.number1.oninput = function () {
  //   document.getElementById('chart').innerHTML = '';
  //   render(data, document.getElementById('chart'))
  // }
  if (reset) {
    settings_register.visible_depth.max = '' + data['max depth']
    if (settings_register.visible_depth.style.visibility === 'hidden') {
      settings_register.visible_depth.style.visibility = 'visible'
      settings_register.visible_depth.value = (data['max depth'] - 1)
    }
    document.getElementById('chart').innerHTML = '';
    render(data, document.getElementById('chart'))
    document.getElementById('chart').children.item(0).click()
  } else {
    col_width = width / PartitionCustom.focused[1]['max depth']
    height_expansion = (settings_register.number1.value - 20 * PartitionCustom.focused[1].depth) / PartitionCustom.focused[1].value
    refresh(data, document.getElementById('chart').children.item(0))
  }

}

const PackedRepr = PartitionCustom//CircleTrue;


window.addEventListener('message', event => {
  const message = event.data;
  console.log('message:', message)
  const computed = toTree(message)
  console.log('computed ', computed[0])
  // Tree({name:'gutenberg',children:computed});
  PackedRepr({ name: 'gutenberg', children: computed });
  // const computed = Object.values(message)
  // console.log('computed ', computed)
  // Grid(computed)
})

let margin_top = 0,
  margin_bottom = 0;

// modify settings_register
function settings_setup() {
  // main d3 settings
  {
    const settings = document.createElement('div')
    settings.classList.add('settings')
    settings.style = 'left:0;top:inherit;'
    document.getElementById('settings').appendChild(settings)
  }
  {
    const settings = document.createElement('div')
    settings.classList.add('settings')
    settings.style = 'left:0;bottom:0;'
    document.getElementById('settings').appendChild(settings)
    {
      const block = document.createElement('span')
      block.id = 'modeButton'
      block.classList.add("radio-group")
      settings.appendChild(block);
      [{ name: 'zoom in/out', value: 'zoom', checked: true },
      { name: 'jump to declaration', value: 'jump to decl' },
      { name: 'show context', value: 'show context' }]
        .forEach(({ name, value, checked }) => {
          const b = document.createElement('input')
          b.type = 'radio'
          b.name = 'modeButton'
          b.value = value
          b.id = 'radio-' + value.replace(/ /g, '-')
          b.innerHTML = name
          if (checked) { b.toggleAttribute('checked') }
          block.appendChild(b)
          const lab = document.createElement('label')
          lab.setAttribute('for', 'radio-' + value.replace(/ /g, '-'))
          lab.onclick = ""
          lab.innerHTML = name
          block.appendChild(lab)
        })
      window.moving_mode = 'zoom'
      block.onchange = function () {
        block.childNodes.forEach(x => {
          if (x.checked) {
            window.moving_mode = x.value
          }
        }
        )
      }
    }
  }
  // advanced settings
  {
    const cont = document.createElement('div')
    cont.style = 'width:100%;left:0;right0:0;bottom:0;height:0'
    cont.style.position = 'fixed'
    cont.style.zIndex = '100'
    cont.style.backgroundColor = 'hsla(0, 0%, 50%, 0.3)'
    {
      const b = document.createElement('button')
      b.innerHTML = '^'
      b.style = 'margin: 0px auto -30px;padding: 0;top: -30px;height: 30px;position: relative;width: 40px;display: block;'
      b.onclick = function () {
        if (cont.style.height === '0px') {
          cont.style.height = 'auto'
          settings.style.height = 'auto'
          b.innerHTML = 'v'
        } else {
          cont.style.height = 0
          settings.style.height = 0
          b.innerHTML = '^'
        }

      }
      cont.appendChild(b);
    }
    const settings = document.createElement('div')
    settings.id = 'advanced-settings'
    // settings.setAttribute('height', '400px')
    cont.append(settings)
    document.getElementById('chart').insertAdjacentElement('afterend', cont)

    // visible depth
    {
      const a = document.createElement('h2')
      a.innerHTML = 'Visible Depth'
      settings.appendChild(a)

      const container = document.createElement('span')
      settings.appendChild(container);
      const slider = document.createElement('input')
      const vcontainer = document.createElement('input')
      slider.type = 'range'
      slider.min = '0'
      slider.style.visibility = 'hidden'
      // vcontainer.type = 'number'
      // vcontainer.value = slider.value
      // vcontainer.innerHTML = slider.value; // Display the default slider value

      // // Update the current slider value (each time you drag the slider handle)
      // slider.oninput = function () {
      //   vcontainer.value = this.value;
      // }
      // vcontainer.oninput = function () {
      //   slider.value = this.value;
      // }
      container.appendChild(slider);
      settings_register.visible_depth = slider
      // container.appendChild(vcontainer);
    } // in settings_register.visible_depth
    // Heigth Expand
    {
      const a = document.createElement('h2')
      a.innerHTML = 'Vertical Size'
      settings.appendChild(a)

      const container = document.createElement('span')
      settings.appendChild(container);
      const vcontainer = document.createElement('input')
      vcontainer.type = 'number'
      vcontainer.value = 900
      vcontainer.step = 1
      settings_register.number1 = vcontainer
      container.appendChild(vcontainer);
    }
    // Redraw Button
    {
      const b = document.createElement('button')
      b.innerHTML = 'redraw'
      b.onclick = function () {
        PackedRepr()
      }
      settings.appendChild(b);
    }
    // Reset Button
    {
      const b = document.createElement('button')
      b.innerHTML = 'reset'
      b.onclick = function () {
        PackedRepr(undefined, undefined, true)
      }
      settings.appendChild(b);
    }
    // Nodes Sizes
    {
      const title = document.createElement('h2')
      title.innerHTML = 'Nodes Sizes'
      settings.appendChild(title)
      const block = document.createElement('div')
      block.classList.add('no-print')
      block.id = 'legend_size'
      block.style.border = 'solid 2px'
      settings.appendChild(block)

      const input = document.createElement('input')
      input.value = 'sum pocc'
      block.append(input)

      const textarea = document.createElement('textarea')
      textarea.title = 'write accumulator here (can be a function)'
      textarea.style.verticalAlign = 'middle'
      textarea.style.width = '300px'
      textarea.style.height = '32px'
      textarea.innerHTML = `{
  init: data => data.pocc || 0,
  inc: (acc, curr) => curr.reduce((acc, x) => acc + x['sum pocc'], acc)
}`
      settings_register.comp_nodes_sizes = {
        name: input,
        acc_fct: textarea
      }
      block.append(textarea)
    } // in settings_register.comp_nodes_sizes
    // Color Gradients
    {
      const a = document.createElement('h2')
      a.innerHTML = 'Color Gradients'
      settings.appendChild(a)
      const block = document.createElement('div')
      block.classList.add('no-print')
      block.id = 'legend1'
      block.style.border = 'solid 2px'
      settings.appendChild(block)
      // path to current node
      var w = 300, h = 50;


      let gradientCount = 0
      settings_register.color_gradients = []
      const addcblock_button = document.createElement('button')
      addcblock_button.innerHTML = 'add new color gradient'
      addcblock_button.addEventListener('click', function (ev) {
        ev.stopPropagation();
        const cblock = document.createElement('div')
        cblock.style.border = 'solid 1px'
        cblock.style.backgroundColor = 'hsla(0, 0%, 70%, .5)'
        newCBlock(cblock)
        addcblock_button.insertAdjacentElement('beforebegin', cblock)
      })
      block.append(addcblock_button)

      {
        const cblock = document.createElement('div')
        cblock.style.border = 'solid 1px'
        cblock.style.backgroundColor = 'hsla(0, 0%, 70%, .5)'
        newCBlock(cblock, "(data)=>data['zero sum tocc ignore params']!==0", 'hsl(60,80%,60%)', 'hsl(0,80%,30%)', 'zero sum tocc ignore params', `{
  init: data => data.children && data.children[0] && data.children[0].params ? (data['sum tocc'] === 0 ? data['sum pocc'] : 0) : (data['sum tocc'] === 0 && !data.children ? data['sum pocc'] : 0),
  inc: (acc, curr) => curr[0] && curr[0].params ? acc : curr.reduce((acc, x) => acc + x['zero sum tocc ignore params'], acc)
}`)
        addcblock_button.insertAdjacentElement('beforebegin', cblock)
      }
      {
        const cblock = document.createElement('div')
        cblock.style.border = 'solid 1px'
        cblock.style.backgroundColor = 'hsla(0, 0%, 70%, .5)'
        newCBlock(cblock, '(data)=>true', 'hsl(110,80%,60%)', 'hsl(130,80%,20%)', 'sum tocc', `{
  init: data => data.tocc || 0,
  inc: (acc, curr) => curr.reduce((acc, x) => acc + x['sum tocc'], acc)
}`)
        addcblock_button.insertAdjacentElement('beforebegin', cblock)
      }

      function newCBlock(cblock, dcond = '(data)=>true', dc1 = 'hsl(0, 80%, 40%)', dc2 = 'hsl(80, 80%, 40%)', dacc_name = 'count', dacc = '') {
        const count = gradientCount++
        const div0 = document.createElement('div')
        cblock.append(div0)
        const div1 = document.createElement('div')
        {
          const div1cont = document.createElement('div')
          div1cont.append(div1)
          cblock.append(div1cont)
        }
        const div2 = document.createElement('div')
        cblock.append(div2)

        const condi = document.createElement('textarea')
        condi.style.width = '300px'
        condi.style.height = '32px'
        condi.innerHTML = dcond
        div0.append(condi)

        var key = d3.select(div1)
          .append("svg")
          .attr("width", w)
          .attr("height", h)
          .style('vertical-align', 'middle')

        function cInverter(value) {
          const c = d3.hsl(value)
          c.h = c.h + 180
          c.s = 1
          c.l = c.l < 0.35 ? 1 : .0
          return c.toString()
        }

        const color1 = document.createElement('input')
        {
          color1.value = dc1
          color1.style.backgroundColor = color1.value
          color1.style.borderColor = color1.value
          color1.style.margin = '10px'
          color1.style.color = cInverter(color1.value);
          div1.insertAdjacentElement('afterbegin', color1)
        }

        const color2 = document.createElement('input')
        {
          color2.value = dc2
          color2.style.backgroundColor = color2.value
          color2.style.borderColor = color2.value
          color2.style.margin = '10px'
          color2.style.color = cInverter(color2.value);
          div1.insertAdjacentElement('beforeend', color2)
        }

        const acc_name = document.createElement('input')
        acc_name.value = dacc_name
        div2.append(acc_name)

        const acc_fct = document.createElement('textarea')
        acc_fct.style.verticalAlign = 'middle'
        acc_fct.style.width = '300px'
        acc_fct.style.height = '32px'
        acc_fct.innerHTML = dacc
        div2.append(acc_fct)

        var legend = key.append("defs")
          .append("svg:linearGradient")
          .attr("id", "gradient" + count)
          .attr("x1", "0%")
          .attr("y1", "100%")
          .attr("x2", "100%")
          .attr("y2", "100%")
          .attr("spreadMethod", "pad");

        const stop1 = legend.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", color1.value)
          .attr("stop-opacity", 1);

        color1.oninput = function () {
          stop1.attr('stop-color', color1.value)
          color1.style.backgroundColor = color1.value
          color1.style.borderColor = color1.value
          color1.style.color = cInverter(color1.value);
        }

        // legend.append("stop")
        //   .attr("offset", "33%")
        //   .attr("stop-color", "#bae4bc")
        //   .attr("stop-opacity", 1);

        // legend.append("stop")
        //   .attr("offset", "66%")
        //   .attr("stop-color", "#7bccc4")
        //   .attr("stop-opacity", 1);

        const stop2 = legend.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", color2.value)
          .attr("stop-opacity", 1);

        color2.oninput = function () {
          stop2.attr('stop-color', color2.value)
          color2.style.backgroundColor = color2.value
          color2.style.borderColor = color2.value
          color2.style.color = cInverter(color2.value);
        }

        key.append("rect")
          .attr("width", w)
          .attr("height", h - 30)
          .style("fill", `url(#gradient${count})`)
          .attr("transform", "translate(0,10)");


        function scale(domain) {
          const tmp = document.getElementById('scale' + count)
          if (tmp) tmp.remove()
          var y = d3.scaleLog()
            .range([0, 300])
            .domain(domain)
            .base(2);

          var yAxis = d3.axisBottom()
            .scale(y)
            .ticks(5);

          const ticks = key.append("g")
            .attr('id', 'scale' + count)
            .attr("class", "y axis")
            .attr("transform", "translate(0,30)")
            .call(yAxis);
          ticks.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("axis title");
          // ticks.selectAll('* > text').attr("transform", function(d){;return " rotate(45) translate(30,-5)"})
          return y
        }
        // scale([300, 0], [68, 12])

        settings_register.color_gradients.push({
          cond: condi,
          c1: color1, c2: color2,
          scale: scale,
          acc_name: acc_name,
          acc_fct: acc_fct
        })
      }
    } // in settings_register.color_gradients
  }
}

settings_setup();

if (vscode.dummy === true) {
  const computed = toTree(data)
  console.log('computed ', computed)
  // Tree(computed[0]);
  PackedRepr({
    name: 'gutenberg',//'gutenberg',
    children: computed
  });
} else {
  vscode.postMessage({
    command: 'ready'
  })
}
