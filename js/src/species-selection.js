function createSpeciesSelectionMenu() {

    createDivForSpeciesButtons();

    function createDivForSpeciesButtons() {

        compartmentsOfSelectedNode.forEach(function (compartment) {
            d3.select("#menu-species-selection-species-buttons")
                .append("div")
                .attr("id", "compartment_" + compartmentsOfSelectedNode.indexOf(compartment))
                .attr("class", "list " + compartment)
                .append("h4")
                .text(compartment);

            assignSpeciesButtonToCompartmentDiv(compartment);
            checkEmptyCompartment();
        })
    }

    function assignSpeciesButtonToCompartmentDiv(compartment) {

        let rememberSpecies = [];
        nestedData.keys().forEach(function (timeStep) {
            nestedData.get(timeStep).get(selectedNode).get(compartment).keys().forEach(function (buttonSpecies) {
                if (!rememberSpecies.includes(buttonSpecies) && nestedData.get(timeStep).get(selectedNode).get(compartment).get(buttonSpecies) > 0) {
                    rememberSpecies.push(buttonSpecies);
                    addSpeciesButton(compartment, buttonSpecies);
                }
            })
        })
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
                clickButton(this.id)
            });
    }

    function checkEmptyCompartment() {

        compartmentsOfSelectedNode.forEach(function (compartment) {
            if ($(".col-md-4").parents('#compartment_' + compartmentsOfSelectedNode.indexOf(compartment)).length === 1) {
            } else {

                d3.select('#compartment_' + compartmentsOfSelectedNode.indexOf(compartment))
                    .append("h5")
                    .text("[Empty]")
            }
        })
    }

}

function clickButton(indexIdentifier) {
    if (activeComponentIdentifiers.length < 2 && setButtonQuerySelector(indexIdentifier).attr("class") === "btn btn-outline-secondary") {
        addLineOnClick(indexIdentifier);
    } else if (setButtonQuerySelector(indexIdentifier).attr("class") === "btn btn-outline-secondary active") {
        removeLineOnClick(indexIdentifier)
    }

    function setButtonQuerySelector(indexIdentifier) {
        return $("#" + indexIdentifier);
    }

    function addLineOnClick(indexIdentifier) {
        activeComponentIdentifiers.push(indexIdentifier);
        setButtonQuerySelector(indexIdentifier).toggleClass("active");
        createTrajectoryPlot();
    }

    function removeLineOnClick(indexIdentifier) {
        $("#" + indexIdentifier + ".btn-outline-secondary.active").removeAttr("style");
        setButtonQuerySelector(indexIdentifier).removeClass('active');
        let index = activeComponentIdentifiers.indexOf(indexIdentifier);
        if (index > -1) {
            activeComponentIdentifiers.splice(index, 1);
        }
        createTrajectoryPlot();
    }
}