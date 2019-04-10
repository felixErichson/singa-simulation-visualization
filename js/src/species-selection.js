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
        nodeComponentCombinations.forEach(function (identifier) {
            if (getCompartmentFromStringIdentifier(identifier) === compartment) {
                addSpeciesButton(compartment, getSpeciesFromStringIdentifier(identifier))
            }
        });
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

function onSpeciesButtonClick(indexIdentifier) {
    if (activeComponentIdices.length < 2 && getButtonSelector(indexIdentifier).attr("class") === "btn btn-outline-secondary") {
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