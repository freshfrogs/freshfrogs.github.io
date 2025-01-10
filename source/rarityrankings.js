/*

    Custom Rarity Rank Utility for FreshFrogsNFT(FROG)
    Learn more at https://freshfrogs.github.io

*/

var max_supply = 4//040;
var rarity_values = {}

async function count_token_traits() {
    // Trait Values
    for (i = 1; i < max_supply; i++) {
        
        console.log('-- Frog #'+i+' --')
        let metadata = await (await fetch('https://freshfrogs.github.io/frog/json/'+i+'.json')).json();
        for (let j = 0; j < metadata.attributes.length; j++) {
            var attribute = metadata.attributes[j].value;
            var trait_type = metadata.attributes[j].trait_type;
            var rarity_count = parseInt(rarity_values[attribute]) + 1;
            rarity_values[attribute] = parseInt(rarity_count);
        }
    }

    console.log(rarity_values);
}

// 1/([No.ItemsWithTrait]/[No.ItemsInCollection])
var rarityScores = {
    // Frog Types (190)
        'blueDartFrog': 88,
        'blueTreeFrog': 94,
        'brownTreeFrog': 105,
        'cyanTreeFrog': 105,
        'goldenDartFrog': 96,
        'goldenTreeFrog': 72,
        'grayTreeFrog': 92,
        'greenTreeFrog': 96,
        'lightBrownTreeFrog': 105,
        'orangeTreeFrog': 86,
        'pinkTreeFrog': 88,
        'purpleTreeFrog': 83,
        'redEyedTreeFrog': 98,
        'splendidLeafFrog': 75,
        'stawberryDartFrog': 89,
        'tomatoFrog': 92,
        'treeFrog(1)': 79,
        'treeFrog(2)': 165,
        'treeFrog(3)':  205,
        'treeFrog(4)': 247,
        'treeFrog(5)': 281,
        'treeFrog(6)':  361,
        'treeFrog(7)': 397,
        'treeFrog(8)': 405,
        'unknown': 95,
    // Special Frog Types (15)
        'closedEyes': 46,
        'croaking': 48,
        'inversedEyes': 41,
        'peace': 19,
        'thirdEye': 42,
    // Trait (171)
        'blue(2)': 192,
        'blue': 196,
        'brown': 172,
        'cyan': 207,
        'darkGreen': 174,
        'green': 207,
        'natural': 176,
        'orange(2)': 191,
        'orange': 202,
        'pink': 186,
        'purple(2)': 208,
        'purple': 207,
        'red(2)': 221,
        'red': 203,
        'sand': 191,
        'white(2)': 179,
        'white': 200,
        'yellow(2)': 179,
        'yellow': 209,
    // Natural Trait Rarities
        'redEyedTreeFrog_natural': 4,
        'lightBrownTreeFrog_natural': 8,
        'brownTreeFrog_natural': 5,
        'goldenDartFrog_natural': 2,
        'unknown_natural': 2,
        'grayTreeFrog_natural': 6,
        'stawBerryDartFrog_natural': 6,
        'blueDartFrog_natural': 1,
        'splendidLeafFrog_natural': 5,
    //Accessory (10)
        'goldChain': 177,
        'goldDollarChain': 122,
        'silverChain': 233,
        'silverEthChain': 74,
    // Eyes (36)
        'circleGlasses': 82,
        'circleNightVision': 78,
        'circleShadesPurple': 76,
        'circleShadesRed': 87,
        'shades': 65,
        'shadesPurple': 76,
        'shadesThreeD': 75,
        'shadesWhite': 75,
    // Hat (105)
        'baseballCapBlue': 83,
        'baseballCapRed': 65,
        'baseballCapWhite': 82,
        'cowboyHatBlack': 168,
        'cowboyHatBrown': 129,
        'cowboyHatTan': 69,
        'cowboyHatWhite': 73,
        'crown': 79,
        'stockingCap': 72,
        'topHatBlue': 77,
        'topHatRed': 77,
        'topHatYellow': 75,
        'witchBlack': 169,
        'witchBrown': 143,
        'witchStraw': 76,
    // Mouth (45)
        'bandannaBlue': 75,
        'bandannaRed': 78,
        'mask': 76,
        'smoking': 73,
        'smokingCigar': 73,
        'smokingPipe': 84,
        'tongue': 166,
        'tongueFly': 133,
        'tongueSpider': 72,
        'tongueSpiderRed': 70
    }