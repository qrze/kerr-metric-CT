import { ExponentialCost, LinearCost, FirstFreeCost } from "./api/Costs";
import { Localization } from "./api/Localization";
import { BigNumber } from "./api/BigNumber";
import { theory } from "./api/Theory";
import { Utils } from "./api/Utils";

var id = "kerr_metric";
var name = "Kerr Spacetime Dynamics";
var description = "Production derived from rotating spacetime geometry.";
var authors = "qrze, melon";
var version = 1.1;

var currency;

var rUpgrade, spinUpgrade, curvatureUpgrade;
var sigmaExp, deltaExp;

var chapter1, chapter2, chapter3, chapter4;

var r = BigNumber.ONE;
var theta = 1;
var spin = 0.5;

var init = () => {

    currency = theory.createCurrency();

    ///////////////////
    // Regular upgrades

    // k1
    {
        let getDesc = (lvl) => "k_1=" + getK1(lvl).toString(0);

        rUpgrade = theory.createUpgrade(
            0,
            currency,
            new FirstFreeCost(new ExponentialCost(10, Math.log2(2)))
        );

        rUpgrade.getDescription = (_) => Utils.getMath(getDesc(rUpgrade.level));
        rUpgrade.getInfo = (amount) =>
            Utils.getMathTo(getDesc(rUpgrade.level), getDesc(rUpgrade.level + amount));
    }

    // spin parameter
    {
        let getDesc = (lvl) => "a=" + getSpin(lvl).toFixed(2);

        spinUpgrade = theory.createUpgrade(
            1,
            currency,
            new ExponentialCost(20, Math.log2(6))
        );

        spinUpgrade.getDescription = (_) => Utils.getMath(getDesc(spinUpgrade.level));
        spinUpgrade.getInfo = (amount) =>
            Utils.getMathTo(getDesc(spinUpgrade.level), getDesc(spinUpgrade.level + amount));
    }

    // curvature amplifier
    {
        let getDesc = (lvl) => "k_2=2^{" + lvl + "}";

        curvatureUpgrade = theory.createUpgrade(
            2,
            currency,
            new ExponentialCost(50, Math.log2(8))
        );

        curvatureUpgrade.getDescription = (_) => Utils.getMath(getDesc(curvatureUpgrade.level));
        curvatureUpgrade.getInfo = (amount) =>
            Utils.getMathTo(
                "k_2=" + getCurvature(curvatureUpgrade.level),
                "k_2=" + getCurvature(curvatureUpgrade.level + amount)
            );
    }

    /////////////////////
    // Permanent upgrades

    theory.createPublicationUpgrade(0, currency, 1e8);
    theory.createBuyAllUpgrade(1, currency, 1e12);
    theory.createAutoBuyerUpgrade(2, currency, 1e20);

    //////////////////////
    // Milestone upgrades

    theory.setMilestoneCost(new LinearCost(25, 25));

    sigmaExp = theory.createMilestoneUpgrade(0, 3);
    sigmaExp.description = Localization.getUpgradeIncCustomExpDesc("Σ", "0.05");
    sigmaExp.info = Localization.getUpgradeIncCustomExpInfo("Σ", "0.05");

    deltaExp = theory.createMilestoneUpgrade(1, 3);
    deltaExp.description = Localization.getUpgradeIncCustomExpDesc("Δ", "0.05");
    deltaExp.info = Localization.getUpgradeIncCustomExpInfo("Δ", "0.05");

    sigmaExp.boughtOrRefunded = (_) => {
        updateAvailability();
        theory.invalidatePrimaryEquation();
    };

    deltaExp.boughtOrRefunded = (_) => {
        updateAvailability();
        theory.invalidatePrimaryEquation();
    };

    ///////////////////
    // Story chapters

    chapter1 = theory.createStoryChapter(
        0,
        "The Rotating Metric",
        "Rotating masses distort spacetime.\n\nRoy Kerr discovered the exact rotating black hole solution.",
        () => rUpgrade.level > 0
    );

    chapter2 = theory.createStoryChapter(
        1,
        "Event Horizons",
        "In Kerr geometry horizons appear where Δ = 0.\n\nInside this surface escape becomes impossible.",
        () => spinUpgrade.level > 2
    );

    chapter3 = theory.createStoryChapter(
        2,
        "The Ergosphere",
        "Rotation drags spacetime itself.\n\nThis region outside the horizon is called the ergosphere.",
        () => curvatureUpgrade.level > 3
    );

    chapter4 = theory.createStoryChapter(
        3,
        "Energy Extraction",
        "Energy can be extracted from a rotating black hole.\n\nThis phenomenon is called the Penrose process.",
        () => sigmaExp.level > 0
    );

    updateAvailability();
};

var updateAvailability = () => {
    deltaExp.isAvailable = sigmaExp.level > 0;
};

var tick = (elapsedTime, multiplier) => {

    let dt = BigNumber.from(elapsedTime * multiplier);
    let bonus = theory.publicationMultiplier;

    spin = Math.min(getSpin(spinUpgrade.level), 2);

    theta += elapsedTime * 0.1;

    let rVal = r.toNumber();

    let Sigma =
        rVal * rVal +
        spin * spin * Math.pow(Math.cos(theta), 2);

    let Delta =
        rVal * rVal -
        rVal +
        spin * spin;

    Delta = Math.max(Delta, 1e-6);

    let sigmaPow = 1 + sigmaExp.level * 0.05;
    let deltaPow = 1 + deltaExp.level * 0.05;

    let growth =
        getK1(rUpgrade.level) *
        Math.pow(Sigma, sigmaPow) /
        Math.pow(Delta, deltaPow);

    let dr = BigNumber.from(growth).times(dt);

    r = r.plus(dr);

    let production =
        dt
        .times(bonus)
        .times(r)
        .times(getCurvature(curvatureUpgrade.level));

    currency.value = currency.value.plus(production);

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
};

var getPrimaryEquation = () =>
"\\dot{r}=k_1\\frac{\\Sigma^{" + getSigmaExp() + "}}{\\Delta^{" + getDeltaExp() + "}}";

var getSecondaryEquation = () =>
"\\Sigma=r^2+a^2\\cos^2\\theta\\\\\\Delta=r^2-r+a^2";

var getPublicationMultiplier = (tau) =>
tau.pow(0.18).divide(BigNumber.TWO);

var getPublicationMultiplierFormula = (symbol) =>
"\\frac{" + symbol + "^{0.18}}{2}";

var getTau = () => currency.value;

var get2DGraphValue = () =>
currency.value.sign *
(BigNumber.ONE + currency.value.abs()).log10().toNumber();

var getK1 = (level) =>
Utils.getStepwisePowerSum(level, 2, 10, 0);

var getCurvature = (level) =>
BigNumber.TWO.pow(level);

var getSpin = (level) =>
0.5 + level * 0.02;

var getSigmaExp = () =>
(1 + sigmaExp.level * 0.05).toFixed(2);

var getDeltaExp = () =>
(1 + deltaExp.level * 0.05).toFixed(2);

init();
