function createSpeciesSelectionMenu() {

    compartmentsOfSelectedNode.forEach(function (compartment) {
        createDivForSpeciesButton(compartment);
        assignSpeciesButtonsToCompartment(compartment);
        checkEmptyCompartment(compartment);
    });

    function createDivForSpeciesButton(compartment) {
        d3.select("#menu-species-selection-species-buttons")
            .append("div")
            .attr("id", "compartment_" + compartmentsOfSelectedNode.indexOf(compartment))
            .attr("class", "list " + compartment)
            .append("h4")
            .text(compartment);
    }

    function assignSpeciesButtonsToCompartment(compartment) {
        Object.keys(reducedNodeData).forEach(function (identifier) {
            if (getCompartmentFromStringIdentifier(identifier) === compartment) {
                addSpeciesButton(compartment, getSpeciesFromStringIdentifier(identifier))
            }
        });
    }



    function checkEmptyCompartment(compartment) {
        if ($(".col-md-4").parents('#compartment_' + compartmentsOfSelectedNode.indexOf(compartment)).length !== 1) {
            d3.select('#compartment_' + compartmentsOfSelectedNode.indexOf(compartment))
                .append("h5")
                .text("[Empty]")
        }
    }

}

function addSpeciesButton(compartment, species) {
    d3.select("#compartment_" + compartmentsOfSelectedNode.indexOf((compartment)))
        .append("div")
        .attr("class", "col-md-4 center-block")
        .append("button")
        .attr("id", getIndexIdentifier(compartment, species))
        .attr("class", "btn btn-outline-secondary")
        .attr("type", "button")
        .text(species)
        .on("click", function () {
            onSpeciesButtonClick(this.id)
        })
        .on("mouseover", function () {
            generateTooltip(species);
            showTooltip()
        }).on("mouseleave", function () {
            hideTooltip();
    });

    d3.select("#trajectory-view-graph").append("div").attr("class", "row").attr("id", "selected_Button_area").style("position", "absolute").style("bottom", "205px");
}

function onSpeciesButtonClick(indexIdentifier) {
    if (activeComponentIdices.length < 2 && getButtonSelector(indexIdentifier).attr("class") === "btn btn-outline-secondary") {
        d3.select('[id= "' +indexIdentifier +'"]').remove();

      //TODO auslagern

        d3.select("#selected_Button_area")
            .append("div")
            .attr("class", "col-xs-4")
            .append("button")
            .attr("id", indexIdentifier)
            .attr("class", "btn btn-outline-secondary")
            .attr("type", "button")
            .text(getSpeciesFromIndexIdentifier(indexIdentifier))
            .on("click", function () {
                hideTooltip();
                removeLine(indexIdentifier);
                d3.select(this).remove();
                addSpeciesButton(getCompartmentFromIndexIdentifier(indexIdentifier), getSpeciesFromIndexIdentifier(indexIdentifier));
            })
            .on("mouseover", function () {
                generateTooltip(getSpeciesFromIndexIdentifier(indexIdentifier) + " - " + getCompartmentFromIndexIdentifier(indexIdentifier));
                showTooltip()
            })
            .on("mouseleave", function () {
            hideTooltip();
            });

        addLine(indexIdentifier);

    } else if (getButtonSelector(indexIdentifier).attr("class") === "btn btn-outline-secondary active") {
        removeLine(indexIdentifier)
    }
}

function addLine(indexIdentifier) {
    activeComponentIdices.push(indexIdentifier);
    getButtonSelector(indexIdentifier).toggleClass("active");
    createTrajectoryPlot();
}

function removeLine(indexIdentifier) {
    $("#" + indexIdentifier + ".btn-outline-secondary.active").removeAttr("style");
    getButtonSelector(indexIdentifier).removeClass('active');
    let index = activeComponentIdices.indexOf(indexIdentifier);
    if (index > -1) {
        activeComponentIdices.splice(index, 1);
    }
    createTrajectoryPlot();
}

function getButtonSelector(indexIdentifier) {
    return $("#" + indexIdentifier);
}