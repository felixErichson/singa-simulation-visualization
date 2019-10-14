const colorgrad = ['#008000', '#208600', '#318d00', '#409300',
    '#4d9900', '#59a000', '#65a600', '#70ac00', '#7cb300',
    '#87b900', '#92bf00', '#9dc600', '#a8cc00', '#b3d300',
    '#bed900', '#c9e000', '#d4e600', '#e0ed00', '#ebf300',
    '#f6fa00', '#fffe00', '#fffa00', '#fff500', '#fff100',
    '#ffec00', '#ffe800', '#ffe300', '#ffdf00', '#ffda00',
    '#ffd600', '#ffd100', '#ffcd00', '#ffc800', '#ffc400',
    '#ffbf00', '#ffba00', '#ffb600', '#ffb100', '#ffad00',
    '#ffa800', '#ffa300', '#ff9e00', '#ff9900', '#ff9300',
    '#ff8e00', '#ff8900', '#ff8300', '#ff7d00', '#ff7700',
    '#ff7100', '#ff6b00', '#ff6500', '#ff5e00', '#ff5700',
    '#ff4f00', '#ff4700', '#ff3e00', '#ff3300', '#ff2500',
    '#ff1000', '#fc000a', '#f60017', '#f00020', '#eb0027',
    '#e5002e', '#df0034', '#d9003a', '#d30040', '#cd0045',
    '#c7004b', '#c10050', '#bb0056', '#b4005b', '#ae0060',
    '#a70065', '#a0006a', '#990070', '#920075', '#8a007a',
    '#82007f', '#7f0085', '#7e008b', '#7d0091', '#7b0097',
    '#79009d', '#7700a4', '#7500aa', '#7200b0', '#6f00b7',
    '#6c00bd', '#6800c3', '#6400ca', '#5f00d0', '#5900d7',
    '#5300de', '#4b00e4', '#4200eb', '#3600f2', '#2600f8', '#0000ff'];


function showSvgCode() {
    let svgExport;

    if ($('input[name="fig"]:checked').val() === "spatial-view") {
        let temp = document.getElementById("trajectory-view-heatmap");
        svgExport = temp.getElementsByTagName("svg")[0];
        exportSVG(svgExport);
    }

    if ($('input[name="fig"]:checked').val() === "sv-legend") {
        let temp = document.getElementById("trajectory-view-heatmap");
        svgExport = temp.getElementsByTagName("svg")[1];
        exportSVG(svgExport);

    }

    if ($('input[name="fig"]:checked').val() === "concentration-plot") {
        let temp = document.getElementById("trajectory-view-graph");
        svgExport = temp.getElementsByTagName("svg")[0];
        exportSVG(svgExport);

    }

    if ($('input[name="fig"]:checked').val() === "vesicle-track") {

        trackVesicleToSvg();

        let temp = document.getElementById("trajectory-view-graph");
        svgExport = temp.getElementsByTagName("svg")[0];
        exportSVG(svgExport);
        heatmapSvg.selectAll("circle").remove();
        // vesicletrack.selectAll("text").remove();
        // vesicletrack.selectAll("circle").remove();

        updateSpatialView(0);

    }
}

function exportSVG(svgExport) {
    let svgxml = (new XMLSerializer).serializeToString(svgExport);

    $("#svg_code").text(svgxml);

//add name spaces.
    if (!svgxml.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        svgxml = svgxml.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!svgxml.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
        svgxml = svgxml.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

//add xml declaration
    svgxml = '<?xml version="1.0" standalone="no"?>\r\n' + svgxml;

//convert svg source to URI data scheme.
    let svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgxml);

    let downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = $('#figure-file-name').val() + ".svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);


}

function trackVesicleToSvg() {

    let paletton = ["green", "yellow", "orange", "red", "purple", "blue"];

    for (let i = 0; i < time.length; i += 20) {

        counter++;
        currentcolor = colorgrad[counter];
        dragedTime = i;

        updateSpatialView(dragedTime, true);

    }

    let vesicletrack =
        d3.select("#heatmapSvg")
            .append("g")
            .attr("transform",
                "translate(60,470)");


    for (let i = 0; i < 6; i++) {

        vesicletrack
            .append("circle")
            .attr("cx", i * 60)
            .attr("cy", "0")
            .attr("r", "5")
            .style("stroke", "black")
            .style("stroke-width", "0.01em")
            .style("fill", paletton[i]);

        vesicletrack
            .append("circle")
            .attr("cx", i * 60)
            .attr("cy", "0")
            .attr("r", "2")
            .style("stroke", "black")
            .style("stroke-width", "0.01em")
            .style("fill", "white");

        vesicletrack
            .append("text")
            .attr("x", (i * 60) - 10)
            .attr("y", "20")
            .style("font-size", "10px")
            .text(Math.trunc(time[Math.trunc(time.length * (i / 6))]) + " ms");

    }

    let temp = document.getElementById("trajectory-view-heatmap");
    let svgExport = temp.getElementsByTagName("svg")[0];
    exportSVG(svgExport);
    //showSvgCode("VesicleTrack20Step.svg");


}