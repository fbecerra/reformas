Promise.all([d3.json("data/reformas.json")]).then(function(projects){
  data = projects[0];
  console.log(data)

  const keys =[['indicaciones', 'indicacion', 'FECHA'],
               ['informes', 'informe', 'FECHAINFORME'],
               ['oficios', 'oficio', 'FECHA'],
               ['tramitacion', 'tramite', 'FECHA'],
               ['urgencias', 'urgencia', 'FECHAINGRESO'],
               ['votaciones', 'votacion', 'FECHA']]

  var parseTime = d3.timeParse("%d/%m/%Y"),
      formatTime = d3.timeFormat("%d de %B de %Y");

  data.forEach(function(d){
    d['camaras'].forEach(function(e){
      e['inicio'] = parseTime(e['inicio']);
      e['termino'] = parseTime(e['termino']);
    })
    for (var i=0; i < keys.length; i++){
      let thisKey = keys[i];
      if (d[thisKey[0]] !== null){
        d[thisKey[0]].forEach(function(e){
          e['FECHA'] = parseTime(e[thisKey[2]])
        })
      }
    }
  })

  var status = new Set(data.map(d => d['descripcion']['estado']));
  status = ["Todos"].concat([...status])
  addOptions("estado", status)

  var authors = data.map(function(d){
    let author = d['autores'];
    if (author != null) {
      if (Array.isArray(author)) {
        return author.map(e => Object.values(e));
      } else {
        return  Object.values(d['autores']);
      }
    } else {
      return null;
    }
  });
  authors = new Set(authors.flat(2).filter(d => d != null))
  authors = ["Todos"].concat([...authors].sort())
  addOptions("autor", authors)

  function addOptions(id, values) {
    var element = d3.select("#"+id);
    var options = element.selectAll("option").data(values);

    options.enter().append("option")
      .html(d => d);

    options.exit().remove();

    return element;
  }

  const lineHeight = 12,
        iconHeight = lineHeight,
        circleOpacity = 0.9,
        tooltipOpacity = 1.0;

  let minDate = d3.min(data, d => d3.min(d['tramitacion'], e => e['FECHA'])),
      maxDate = d3.max(data, d => d3.max(d['tramitacion'], e => e['FECHA']));

  var margin = {top: 60, right: 20, bottom: 20, left: 180};

  var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("max-width", margin.left * 4/3 + "px");

  var width = window.innerWidth - margin.left - margin.right,
      height = data.length * lineHeight;

  var svg = d3.select("body").append("svg")
    .attr("viewBox", [0, 0, width + margin.left + margin.right, height])

 var colorScale = d3.schemeSpectral[9];

  var x = d3.scaleUtc()
    .domain([minDate, maxDate])
    .range([margin.left, width - margin.right])

  var y = d3.scaleLinear()
    .domain([0, data.length])
    .rangeRound([margin.top + lineHeight/2, height])

  var xAxis = g => g
    .attr("transform", `translate(0,${margin.top})`)
    .call(d3.axisTop(x))
    .call(g => g.selectAll(".tick line").clone()
              .attr("stroke-opacity", 0.05)
              .attr("y2", height - margin.bottom))
    .call(g => g.selectAll(".domain").remove())

  var xAxisBottom = g => g
    .attr("transform", `translate(0,${height + margin.top - margin.bottom})`)
    .call(d3.axisBottom(x))
    .call(g => g.selectAll(".domain").remove())

  svg.append("g")
    .call(xAxis)

  svg.append("g")
    .call(xAxisBottom)

  const g = svg.append("g")
      .style("font", "10px sans-serif")
    .selectAll("g")
    .data(data)
    .join("g")
      .attr("transform", (d, i) => `translate(0,${y(i)})`);

  g.append("line")
    .attr("stroke", "#aaa")
    .attr("stroke-width", 1.0)
    .attr("x1", d => x(d3.min(d['tramitacion'], k => k['FECHA'])))
    .attr("x2", d => x(d3.max(d['tramitacion'], k => k['FECHA'])));

  g.selectAll(".senado")
    .data(d => d['camaras'].filter(e => e['camara'] == 'Senado'))
    .join("line")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 3)
      .attr("x1", d => x(d['inicio']))
      .attr("x2", d => x(d['termino']));

  g.append("g")
    .selectAll(".tramite")
    .data(d => d['tramitacion'])
    .join("circle")
      .attr("class", "tramite")
      .attr("opacity", circleOpacity)
      .attr("cx", d => x(d['FECHA']))
      .attr("fill", "#225ea8")
      .attr("r", 3.5)
      .on("mouseover", function(event, d){
        tooltip.html(`<p><strong>Sesion ${d['SESION']}</strong></p>
              <p><strong>Fecha:</strong> ${formatTime(d['FECHA'])}</p>
              <p><strong>Cámara:</strong> ${d['CAMARATRAMITE']}</p>
              <p><strong>Etapa:</strong> ${d['ETAPDESCRIPCION']}</p>
              <p><strong>Descripción:</strong> ${d['DESCRIPCIONTRAMITE']}</p>`)

        var xOffset = tooltip.node().getBoundingClientRect().width / 2.,
            yOffset = tooltip.node().getBoundingClientRect().height;
        tooltip.style("left", x(d['FECHA']) - xOffset + "px")
          .style("top", event.pageY - yOffset - 15 + "px")
          .transition().duration(200).style("opacity", tooltipOpacity);
      })
      .on("mouseleave", function(event, d){
        tooltip.transition().duration(200).style("opacity", 0);
      });;

  g.append("g")
    .selectAll(".oficio")
    .data(d => d['oficios'] == null ? [] : d['oficios'])
    .join("circle")
      .attr("class", "oficio")
      .attr("opacity", circleOpacity)
      .attr("cx", d => x(d['FECHA']))
      .attr("fill", "#41b6c4")
      .attr("r", 3.5)
      .on("mouseover", function(event, d){
        tooltip.html(`<p><strong>Oficio número ${d['NUMERO']}</strong></p>
              <p><strong>Detalle:</strong> ${d['DESCRIPCION']}</p>
              <p><strong>Fecha:</strong> ${formatTime(d['FECHA'])}</p>
              <p><strong>Etapa:</strong> ${d['ETAPA']}</p>
              <p><strong>Trámite:</strong> ${d['TRAMITE']}</p>
              <p><strong>Tipo:</strong> ${d['TIPO']}</p>`)

        var xOffset = tooltip.node().getBoundingClientRect().width / 2.,
            yOffset = tooltip.node().getBoundingClientRect().height;
        tooltip.style("left", x(d['FECHA']) - xOffset + "px")
          .style("top", event.pageY - yOffset - 15 + "px")
          .transition().duration(200).style("opacity", tooltipOpacity);
      })
      .on("mouseleave", function(event, d){
        tooltip.transition().duration(200).style("opacity", 0);
      });;

  g.append("g")
    .selectAll(".informe")
    .data(d => d['informes'] == null ? [] : d['informes'])
    .join("circle")
      .attr("class", "informe")
      .attr("opacity", circleOpacity)
      .attr("cx", d => x(d['FECHA']))
      .attr("fill", "#c7e9b4")
      .attr("r", 3.5)
      .on("mouseover", function(event, d){
        tooltip.html(`<p><strong>${d['TRAMITE']}</strong></p>
              <p><strong>Fecha:</strong> ${formatTime(d['FECHA'])}</p>
              <p><strong>Etapa:</strong> ${d['ETAPA']}</p>`)

        var xOffset = tooltip.node().getBoundingClientRect().width / 2.,
            yOffset = tooltip.node().getBoundingClientRect().height;
        tooltip.style("left", x(d['FECHA']) - xOffset + "px")
          .style("top", event.pageY - yOffset - 15 + "px")
          .transition().duration(200).style("opacity", tooltipOpacity);
      })
      .on("mouseleave", function(event, d){
        tooltip.transition().duration(200).style("opacity", 0);
      });

  g.append('svg:image')
    .attr('xlink:href', function(d){
      let icon;
      let status = d['descripcion']['estado'].toLowerCase();
      if (status.includes("publicado")) {
        icon = 'img/checkmark-circle-outline.svg'
      } else if (status.includes("en tramitación")) {
        icon = 'img/refresh-circle-outline.svg'
      } else {
        icon = 'img/close-circle-outline.svg'
      }
      return icon;
    })
    .attr("x", d => x(d['tramitacion'][d['tramitacion'].length-1]['FECHA']) + 10)
    .attr("y", -iconHeight/2)
    .attr("width", iconHeight + "px")
    .attr("height", iconHeight + "px")

  g.append('text')
    .attr("x", width + 20)
    .attr("y", lineHeight/4)
    .style("text-anchor", "left")
    .style("vertical-align", "middle")
    .attr('fill', function(d){
      let color;
      let status = d['descripcion']['estado'].toLowerCase();
      if (status.includes("publicado")) {
        color = '#238b45'
      } else if (status.includes("en tramitación")) {
        color = '#ec7014'
      } else {
        color = '#cb181d'
      }
      return color;
    })
    .text(d => d['descripcion']['estado'])

  const name = svg.append("g")

  svg.on("touchmove mousemove", function(event) {
    // const bisect = d3.bisector(d => d.date).left;
    let thisX = d3.pointer(event, this)[0],
        thisY = d3.pointer(event, this)[1],
        index = Math.floor(y.invert(thisY + lineHeight/2));
    let project = data[index];
    // console.log(thisX, margin.left/2, width + margin.left/2)
    if (y(0) - lineHeight/2 < thisY && thisY < height - margin.bottom + lineHeight/2 &&
        margin.left < thisX  && thisX < width){
      // console.log(project)
      name
          .attr("transform", `translate(${x(project['tramitacion'][0]['FECHA'])},${y(index)})`)
          .call(calloutName, `${project['descripcion']['titulo']}`);

      g.style("opacity", 0.2)
      g.filter(d => d == project)
        .style("opacity", 1)

    } else {
      name.call(calloutName, null);
      g.style("opacity", 1);
    }

  });

  calloutName = (g, value) => {
    if (!value) return g.style("display", "none");

    g
        .style("display", null)
        .style("pointer-events", "none")
        .style("font", "10px sans-serif");

    const text = g.selectAll("text")
      .data([null])
      .join("text")
      .text(value)
      .call(wrap, margin.left - 20);

    function wrap(text, width) {
      text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            bold = true,
            y = text.attr("y"),
            dy = parseFloat("0"),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em").style("font-weight", "bold");
        while (word = words.pop()) {
          line.push(word);
          tspan.text(line.join(" "));
          if (tspan.node().getComputedTextLength() > width || word[word.length -1] == ':') {
            line.pop();
            tspan.text(line.join(" ")).style("font-weight", "bold");
            line = [word];
            tspan = text.append("tspan").attr("x", 0).attr("y", ++lineNumber * lineHeight + dy + "em").attr("dy", 0).text(word).style("font-weight", "bold");
          }
        }
      });
      }

    const {x, y, width: w, height: h} = text.node().getBBox();

    text.attr("transform", `translate(${-w - 10},0)`);
  }
})