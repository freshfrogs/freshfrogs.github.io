/*

    Custom Rarity Rank Utility for FreshFrogsNFT(FROG)
    Learn more at https://freshfrogs.github.io

*/

var max_supply = 4040;
var rarity_trait_rankings = {}
var rarity_token_rankings = [];
var freshfrogs_rarity_rankings = [];

async function count_token_traits() {
    // Trait Values
    for (i = 1; i < max_supply; i++) {
        
        console.log('-- Frog #'+i+' --')
        let metadata = await (await fetch('https://freshfrogs.github.io/frog/json/'+i+'.json')).json();
        for (let j = 0; j < metadata.attributes.length; j++) {
            var attribute = metadata.attributes[j].value;
            var trait_type = metadata.attributes[j].trait_type;
            if (typeof rarity_trait_rankings[attribute] !== 'undefined') {
                var rarity_count = parseInt(rarity_trait_rankings[attribute]) + 1;
                rarity_trait_rankings[attribute] = parseInt(rarity_count);
            } else {
                rarity_trait_rankings[attribute] = 1;
            }
        }
    }

    console.log(rarity_trait_rankings);
}


async function rank_tokens() {
    for (i = 1; i < 41; i++) {
        
        console.log('=-=- Frog #'+i+' -=-=')
        rarity_token_rankings[i] = { id: i, rarity: 1, type: '' };

        let metadata = await (await fetch('https://freshfrogs.github.io/frog/json/'+i+'.json')).json();
        for (let j = 0; j < metadata.attributes.length; j++) {
            var attribute = metadata.attributes[j].value;
            var trait_type = metadata.attributes[j].trait_type;

            // Frog Type
            if (trait_type == 'Frog' || trait_type == 'SpecialFrog') {
                var frog_type = attribute;
                rarity_token_rankings[i].type = attribute;

                if (trait_type == 'SpecialFrog') {
                    // Special Frog Missing Trait Bonus
                    var rarity_raw = parseInt(rarity_token_rankings[i].rarity) + 1/(parseInt(rarity_trait_rankings['natural'])/4040)
                    rarity_token_rankings[i].rarity = parseInt(rarity_raw);
                }
            }

            // Natural Trait Bonus
            if (attribute == 'natural' && trait_type == 'Trait') {
                if (frog_type == 'redEyedTreeFrog' || frog_type == 'lightBrownTreeFrog' || frog_type == 'brownTreeFrog' || frog_type == 'goldenDartFrog' || frog_type == 'unknown' || frog_type == 'grayTreeFrog' || frog_type == 'stawberryDartFrog' || frog_type == 'blueDartFrog' || frog_type == 'splendidLeafFrog') {

                    // Natural Rarity Score
                    var rarity_raw = parseInt(rarity_token_rankings[i].rarity) + 1/(parseInt(rarity_trait_rankings[frog_type+'_natural'])/4040)
                    rarity_token_rankings[i].rarity = parseInt(rarity_raw);

                } else {

                    // Calculate Rarity Score
                    var rarity_raw = parseInt(rarity_token_rankings[i].rarity) + 1/(parseInt(rarity_trait_rankings[attribute])/4040)
                    rarity_token_rankings[i].rarity = parseInt(rarity_raw);
                }
            } else {

                // Calculate Rarity Score
                var rarity_raw = parseInt(rarity_token_rankings[i].rarity) + 1/(parseInt(rarity_trait_rankings[attribute])/4040)
                rarity_token_rankings[i].rarity = parseInt(rarity_raw);
            }

        }
        
    }

    console.log(rarity_token_rankings);
    
    let frogs = rarity_token_rankings;

    // Remove null values from the array
    frogs = frogs.filter(frog => frog !== null);

    // Sort by rarity in descending order
    frogs.sort((a, b) => b.rarity - a.rarity);

    // Add rank value to each object based on the sorted order
    frogs.forEach((frog, index) => {
        frog.rank = index + 1; // Rank starts from 1
    });

    console.log(frogs);
}



async function render_token_byrarity(batch, leftoff) {
    try{

        if(! leftoff) { leftoff = 0; }
        for (i = 0; i < batch; i++) {
            var frog = freshfrogs_rarity_rankings[i].id
            var frog_rarity = freshfrogs_rarity_rankings[i].rarity

            var html_elements = 
            '<div class="infobox_left">'+
                '<text class="card_text">Owner</text>'+'<br>'+
                '<text class="card_bold">'+'--'+'</text>'+
            '</div>'+
            '<div class="infobox_right">'+
                '<text class="card_text">Price</text>'+'<br>'+
                '<text id="frog_type" class="card_bold">'+'--'+'Ξ '+'</text>'+'<text id="usd_price" class="usd_price">$'+'--'+'</text>'+
            '</div>'+
            '<br>'+
            '<div class="infobox_left">'+
                '<text class="card_text">'+'Score'+'</text>'+'<br>'+
                '<text class="card_bold">'+frog_rarity+'</text>'+
            '</div>'+
            '<div class="infobox_right">'+
                '<text class="card_text">Rarity</text>'+'<br>'+
                '<text id="rarityRanking_'+frog+'" class="card_bold">'+rarity_rank+'</text>'+
            '</div>'+
            '<div id="buttonsPanel_'+frog+'" class="card_buttonbox">'+
                '<a href="https://etherscan.io/nft/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+frog+'" target="_blank"><button class="etherscan_button">Etherscan</button></a>'+
                '<a href="https://opensea.io/assets/ethereum/0xbe4bef8735107db540de269ff82c7de9ef68c51b/'+frog+'" target="_blank"><button class="opensea_button">Opensea</button></a>'+
            '</div>';
    
            await build_token(html_elements, frog, frog+':'+'', '', '');
    
        }
    } catch(e) {
        console.log(e.message)
    }
}

// 1/([No.ItemsWithTrait]/[No.ItemsInCollection])
var rarity_trait_rankings = {
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
        'rare_natural': 39,
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
        'stawberryDartFrog_natural': 6,
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

    
    var freshfrogs_rarity_rankings = 
    [
        {
            "id": 3090,
            "rarity": 322,
            "type": "peace",
            "ranking": 1
        },
        {
            "id": 2917,
            "rarity": 271,
            "type": "peace",
            "ranking": 2
        },
        {
            "id": 2071,
            "rarity": 270,
            "type": "peace",
            "ranking": 3
        },
        {
            "id": 3339,
            "rarity": 268,
            "type": "peace",
            "ranking": 4
        },
        {
            "id": 2113,
            "rarity": 266,
            "type": "peace",
            "ranking": 5
        },
        {
            "id": 3780,
            "rarity": 266,
            "type": "peace",
            "ranking": 6
        },
        {
            "id": 1968,
            "rarity": 265,
            "type": "peace",
            "ranking": 7
        },
        {
            "id": 2452,
            "rarity": 262,
            "type": "peace",
            "ranking": 8
        },
        {
            "id": 3318,
            "rarity": 261,
            "type": "peace",
            "ranking": 9
        },
        {
            "id": 3153,
            "rarity": 259,
            "type": "peace",
            "ranking": 10
        },
        {
            "id": 2819,
            "rarity": 246,
            "type": "peace",
            "ranking": 11
        },
        {
            "id": 2179,
            "rarity": 244,
            "type": "peace",
            "ranking": 12
        },
        {
            "id": 3093,
            "rarity": 243,
            "type": "peace",
            "ranking": 13
        },
        {
            "id": 2821,
            "rarity": 241,
            "type": "lightBrownTreeFrog",
            "ranking": 14
        },
        {
            "id": 548,
            "rarity": 237,
            "type": "peace",
            "ranking": 15
        },
        {
            "id": 1834,
            "rarity": 237,
            "type": "peace",
            "ranking": 16
        },
        {
            "id": 3744,
            "rarity": 237,
            "type": "splendidLeafFrog",
            "ranking": 17
        },
        {
            "id": 2100,
            "rarity": 236,
            "type": "peace",
            "ranking": 18
        },
        {
            "id": 1948,
            "rarity": 235,
            "type": "splendidLeafFrog",
            "ranking": 19
        },
        {
            "id": 3421,
            "rarity": 235,
            "type": "peace",
            "ranking": 20
        },
        {
            "id": 3552,
            "rarity": 230,
            "type": "peace",
            "ranking": 21
        },
        {
            "id": 1129,
            "rarity": 227,
            "type": "stawberryDartFrog",
            "ranking": 22
        },
        {
            "id": 3111,
            "rarity": 227,
            "type": "splendidLeafFrog",
            "ranking": 23
        },
        {
            "id": 2101,
            "rarity": 224,
            "type": "stawberryDartFrog",
            "ranking": 24
        },
        {
            "id": 1483,
            "rarity": 222,
            "type": "grayTreeFrog",
            "ranking": 25
        },
        {
            "id": 3868,
            "rarity": 222,
            "type": "stawberryDartFrog",
            "ranking": 26
        },
        {
            "id": 3239,
            "rarity": 220,
            "type": "grayTreeFrog",
            "ranking": 27
        },
        {
            "id": 818,
            "rarity": 217,
            "type": "grayTreeFrog",
            "ranking": 28
        },
        {
            "id": 1486,
            "rarity": 217,
            "type": "lightBrownTreeFrog",
            "ranking": 29
        },
        {
            "id": 2657,
            "rarity": 217,
            "type": "lightBrownTreeFrog",
            "ranking": 30
        },
        {
            "id": 2858,
            "rarity": 217,
            "type": "brownTreeFrog",
            "ranking": 31
        },
        {
            "id": 1624,
            "rarity": 216,
            "type": "goldenDartFrog",
            "ranking": 32
        },
        {
            "id": 2219,
            "rarity": 216,
            "type": "lightBrownTreeFrog",
            "ranking": 33
        },
        {
            "id": 343,
            "rarity": 213,
            "type": "peace",
            "ranking": 34
        },
        {
            "id": 3593,
            "rarity": 213,
            "type": "brownTreeFrog",
            "ranking": 35
        },
        {
            "id": 1182,
            "rarity": 212,
            "type": "lightBrownTreeFrog",
            "ranking": 36
        },
        {
            "id": 3264,
            "rarity": 208,
            "type": "inversedEyes",
            "ranking": 37
        },
        {
            "id": 1919,
            "rarity": 205,
            "type": "thirdEye",
            "ranking": 38
        },
        {
            "id": 1228,
            "rarity": 204,
            "type": "inversedEyes",
            "ranking": 39
        },
        {
            "id": 2832,
            "rarity": 201,
            "type": "splendidLeafFrog",
            "ranking": 40
        },
        {
            "id": 3190,
            "rarity": 201,
            "type": "unknown",
            "ranking": 41
        },
        {
            "id": 2873,
            "rarity": 200,
            "type": "redEyedTreeFrog",
            "ranking": 42
        },
        {
            "id": 782,
            "rarity": 199,
            "type": "stawberryDartFrog",
            "ranking": 43
        },
        {
            "id": 2581,
            "rarity": 193,
            "type": "grayTreeFrog",
            "ranking": 44
        },
        {
            "id": 1755,
            "rarity": 192,
            "type": "brownTreeFrog",
            "ranking": 45
        },
        {
            "id": 991,
            "rarity": 191,
            "type": "redEyedTreeFrog",
            "ranking": 46
        },
        {
            "id": 998,
            "rarity": 191,
            "type": "grayTreeFrog",
            "ranking": 47
        },
        {
            "id": 2545,
            "rarity": 191,
            "type": "closedEyes",
            "ranking": 48
        },
        {
            "id": 564,
            "rarity": 190,
            "type": "goldenDartFrog",
            "ranking": 49
        },
        {
            "id": 1401,
            "rarity": 189,
            "type": "redEyedTreeFrog",
            "ranking": 50
        },
        {
            "id": 3727,
            "rarity": 189,
            "type": "thirdEye",
            "ranking": 51
        },
        {
            "id": 51,
            "rarity": 188,
            "type": "stawberryDartFrog",
            "ranking": 52
        },
        {
            "id": 338,
            "rarity": 188,
            "type": "brownTreeFrog",
            "ranking": 53
        },
        {
            "id": 1161,
            "rarity": 188,
            "type": "lightBrownTreeFrog",
            "ranking": 54
        },
        {
            "id": 3865,
            "rarity": 187,
            "type": "lightBrownTreeFrog",
            "ranking": 55
        },
        {
            "id": 101,
            "rarity": 184,
            "type": "redEyedTreeFrog",
            "ranking": 56
        },
        {
            "id": 2429,
            "rarity": 182,
            "type": "greenTreeFrog",
            "ranking": 57
        },
        {
            "id": 1201,
            "rarity": 179,
            "type": "orangeTreeFrog",
            "ranking": 58
        },
        {
            "id": 1690,
            "rarity": 179,
            "type": "splendidLeafFrog",
            "ranking": 59
        },
        {
            "id": 2929,
            "rarity": 179,
            "type": "treeFrog(1)",
            "ranking": 60
        },
        {
            "id": 3606,
            "rarity": 179,
            "type": "inversedEyes",
            "ranking": 61
        },
        {
            "id": 963,
            "rarity": 176,
            "type": "treeFrog(1)",
            "ranking": 62
        },
        {
            "id": 1021,
            "rarity": 176,
            "type": "thirdEye",
            "ranking": 63
        },
        {
            "id": 1694,
            "rarity": 176,
            "type": "grayTreeFrog",
            "ranking": 64
        },
        {
            "id": 2986,
            "rarity": 175,
            "type": "croaking",
            "ranking": 65
        },
        {
            "id": 2411,
            "rarity": 174,
            "type": "closedEyes",
            "ranking": 66
        },
        {
            "id": 2926,
            "rarity": 174,
            "type": "purpleTreeFrog",
            "ranking": 67
        },
        {
            "id": 3546,
            "rarity": 174,
            "type": "closedEyes",
            "ranking": 68
        },
        {
            "id": 1213,
            "rarity": 172,
            "type": "thirdEye",
            "ranking": 69
        },
        {
            "id": 3223,
            "rarity": 172,
            "type": "closedEyes",
            "ranking": 70
        },
        {
            "id": 3930,
            "rarity": 172,
            "type": "inversedEyes",
            "ranking": 71
        },
        {
            "id": 407,
            "rarity": 171,
            "type": "blueDartFrog",
            "ranking": 72
        },
        {
            "id": 2281,
            "rarity": 171,
            "type": "blueTreeFrog",
            "ranking": 73
        },
        {
            "id": 3229,
            "rarity": 171,
            "type": "stawberryDartFrog",
            "ranking": 74
        },
        {
            "id": 660,
            "rarity": 170,
            "type": "croaking",
            "ranking": 75
        },
        {
            "id": 958,
            "rarity": 169,
            "type": "grayTreeFrog",
            "ranking": 76
        },
        {
            "id": 1160,
            "rarity": 169,
            "type": "inversedEyes",
            "ranking": 77
        },
        {
            "id": 2267,
            "rarity": 169,
            "type": "brownTreeFrog",
            "ranking": 78
        },
        {
            "id": 303,
            "rarity": 168,
            "type": "croaking",
            "ranking": 79
        },
        {
            "id": 415,
            "rarity": 168,
            "type": "unknown",
            "ranking": 80
        },
        {
            "id": 3723,
            "rarity": 168,
            "type": "blueTreeFrog",
            "ranking": 81
        },
        {
            "id": 4000,
            "rarity": 168,
            "type": "goldenDartFrog",
            "ranking": 82
        },
        {
            "id": 409,
            "rarity": 167,
            "type": "redEyedTreeFrog",
            "ranking": 83
        },
        {
            "id": 50,
            "rarity": 165,
            "type": "inversedEyes",
            "ranking": 84
        },
        {
            "id": 1296,
            "rarity": 164,
            "type": "brownTreeFrog",
            "ranking": 85
        },
        {
            "id": 2228,
            "rarity": 164,
            "type": "croaking",
            "ranking": 86
        },
        {
            "id": 2261,
            "rarity": 164,
            "type": "lightBrownTreeFrog",
            "ranking": 87
        },
        {
            "id": 2476,
            "rarity": 163,
            "type": "closedEyes",
            "ranking": 88
        },
        {
            "id": 1390,
            "rarity": 162,
            "type": "croaking",
            "ranking": 89
        },
        {
            "id": 157,
            "rarity": 161,
            "type": "unknown",
            "ranking": 90
        },
        {
            "id": 2300,
            "rarity": 161,
            "type": "inversedEyes",
            "ranking": 91
        },
        {
            "id": 2369,
            "rarity": 161,
            "type": "inversedEyes",
            "ranking": 92
        },
        {
            "id": 2054,
            "rarity": 159,
            "type": "thirdEye",
            "ranking": 93
        },
        {
            "id": 3554,
            "rarity": 159,
            "type": "thirdEye",
            "ranking": 94
        },
        {
            "id": 2844,
            "rarity": 158,
            "type": "croaking",
            "ranking": 95
        },
        {
            "id": 3125,
            "rarity": 158,
            "type": "treeFrog(2)",
            "ranking": 96
        },
        {
            "id": 3221,
            "rarity": 157,
            "type": "inversedEyes",
            "ranking": 97
        },
        {
            "id": 1683,
            "rarity": 156,
            "type": "inversedEyes",
            "ranking": 98
        },
        {
            "id": 2944,
            "rarity": 156,
            "type": "treeFrog(2)",
            "ranking": 99
        },
        {
            "id": 536,
            "rarity": 155,
            "type": "inversedEyes",
            "ranking": 100
        },
        {
            "id": 1034,
            "rarity": 155,
            "type": "croaking",
            "ranking": 101
        },
        {
            "id": 1858,
            "rarity": 155,
            "type": "thirdEye",
            "ranking": 102
        },
        {
            "id": 2881,
            "rarity": 155,
            "type": "inversedEyes",
            "ranking": 103
        },
        {
            "id": 3033,
            "rarity": 155,
            "type": "croaking",
            "ranking": 104
        },
        {
            "id": 347,
            "rarity": 154,
            "type": "inversedEyes",
            "ranking": 105
        },
        {
            "id": 1077,
            "rarity": 154,
            "type": "thirdEye",
            "ranking": 106
        },
        {
            "id": 1818,
            "rarity": 154,
            "type": "closedEyes",
            "ranking": 107
        },
        {
            "id": 2729,
            "rarity": 154,
            "type": "inversedEyes",
            "ranking": 108
        },
        {
            "id": 2800,
            "rarity": 154,
            "type": "inversedEyes",
            "ranking": 109
        },
        {
            "id": 2970,
            "rarity": 154,
            "type": "orangeTreeFrog",
            "ranking": 110
        },
        {
            "id": 719,
            "rarity": 153,
            "type": "thirdEye",
            "ranking": 111
        },
        {
            "id": 1381,
            "rarity": 153,
            "type": "croaking",
            "ranking": 112
        },
        {
            "id": 1456,
            "rarity": 153,
            "type": "inversedEyes",
            "ranking": 113
        },
        {
            "id": 2919,
            "rarity": 153,
            "type": "thirdEye",
            "ranking": 114
        },
        {
            "id": 1503,
            "rarity": 152,
            "type": "inversedEyes",
            "ranking": 115
        },
        {
            "id": 1846,
            "rarity": 152,
            "type": "inversedEyes",
            "ranking": 116
        },
        {
            "id": 2258,
            "rarity": 152,
            "type": "inversedEyes",
            "ranking": 117
        },
        {
            "id": 2444,
            "rarity": 152,
            "type": "inversedEyes",
            "ranking": 118
        },
        {
            "id": 2774,
            "rarity": 152,
            "type": "thirdEye",
            "ranking": 119
        },
        {
            "id": 2949,
            "rarity": 152,
            "type": "inversedEyes",
            "ranking": 120
        },
        {
            "id": 2984,
            "rarity": 152,
            "type": "thirdEye",
            "ranking": 121
        },
        {
            "id": 3394,
            "rarity": 152,
            "type": "inversedEyes",
            "ranking": 122
        },
        {
            "id": 3537,
            "rarity": 152,
            "type": "thirdEye",
            "ranking": 123
        },
        {
            "id": 3958,
            "rarity": 152,
            "type": "treeFrog(1)",
            "ranking": 124
        },
        {
            "id": 3996,
            "rarity": 152,
            "type": "inversedEyes",
            "ranking": 125
        },
        {
            "id": 3998,
            "rarity": 152,
            "type": "inversedEyes",
            "ranking": 126
        },
        {
            "id": 1014,
            "rarity": 151,
            "type": "croaking",
            "ranking": 127
        },
        {
            "id": 2036,
            "rarity": 151,
            "type": "inversedEyes",
            "ranking": 128
        },
        {
            "id": 2251,
            "rarity": 151,
            "type": "inversedEyes",
            "ranking": 129
        },
        {
            "id": 3708,
            "rarity": 151,
            "type": "thirdEye",
            "ranking": 130
        },
        {
            "id": 17,
            "rarity": 150,
            "type": "thirdEye",
            "ranking": 131
        },
        {
            "id": 160,
            "rarity": 150,
            "type": "closedEyes",
            "ranking": 132
        },
        {
            "id": 264,
            "rarity": 150,
            "type": "treeFrog(7)",
            "ranking": 133
        },
        {
            "id": 408,
            "rarity": 150,
            "type": "thirdEye",
            "ranking": 134
        },
        {
            "id": 598,
            "rarity": 150,
            "type": "thirdEye",
            "ranking": 135
        },
        {
            "id": 679,
            "rarity": 150,
            "type": "inversedEyes",
            "ranking": 136
        },
        {
            "id": 860,
            "rarity": 150,
            "type": "thirdEye",
            "ranking": 137
        },
        {
            "id": 919,
            "rarity": 150,
            "type": "thirdEye",
            "ranking": 138
        },
        {
            "id": 2468,
            "rarity": 150,
            "type": "thirdEye",
            "ranking": 139
        },
        {
            "id": 2540,
            "rarity": 150,
            "type": "closedEyes",
            "ranking": 140
        },
        {
            "id": 2717,
            "rarity": 150,
            "type": "treeFrog(2)",
            "ranking": 141
        },
        {
            "id": 2801,
            "rarity": 150,
            "type": "thirdEye",
            "ranking": 142
        },
        {
            "id": 3154,
            "rarity": 150,
            "type": "inversedEyes",
            "ranking": 143
        },
        {
            "id": 3246,
            "rarity": 150,
            "type": "treeFrog(2)",
            "ranking": 144
        },
        {
            "id": 3267,
            "rarity": 150,
            "type": "thirdEye",
            "ranking": 145
        },
        {
            "id": 3503,
            "rarity": 150,
            "type": "inversedEyes",
            "ranking": 146
        },
        {
            "id": 1123,
            "rarity": 149,
            "type": "thirdEye",
            "ranking": 147
        },
        {
            "id": 3444,
            "rarity": 149,
            "type": "thirdEye",
            "ranking": 148
        },
        {
            "id": 1061,
            "rarity": 148,
            "type": "inversedEyes",
            "ranking": 149
        },
        {
            "id": 1893,
            "rarity": 148,
            "type": "thirdEye",
            "ranking": 150
        },
        {
            "id": 1927,
            "rarity": 148,
            "type": "inversedEyes",
            "ranking": 151
        },
        {
            "id": 1965,
            "rarity": 148,
            "type": "thirdEye",
            "ranking": 152
        },
        {
            "id": 3545,
            "rarity": 148,
            "type": "croaking",
            "ranking": 153
        },
        {
            "id": 3903,
            "rarity": 148,
            "type": "unknown",
            "ranking": 154
        },
        {
            "id": 3908,
            "rarity": 148,
            "type": "thirdEye",
            "ranking": 155
        },
        {
            "id": 266,
            "rarity": 147,
            "type": "croaking",
            "ranking": 156
        },
        {
            "id": 1447,
            "rarity": 147,
            "type": "orangeTreeFrog",
            "ranking": 157
        },
        {
            "id": 1902,
            "rarity": 147,
            "type": "inversedEyes",
            "ranking": 158
        },
        {
            "id": 2009,
            "rarity": 147,
            "type": "croaking",
            "ranking": 159
        },
        {
            "id": 3247,
            "rarity": 147,
            "type": "inversedEyes",
            "ranking": 160
        },
        {
            "id": 3794,
            "rarity": 147,
            "type": "thirdEye",
            "ranking": 161
        },
        {
            "id": 2116,
            "rarity": 146,
            "type": "treeFrog(4)",
            "ranking": 162
        },
        {
            "id": 2481,
            "rarity": 146,
            "type": "thirdEye",
            "ranking": 163
        },
        {
            "id": 3425,
            "rarity": 146,
            "type": "grayTreeFrog",
            "ranking": 164
        },
        {
            "id": 3801,
            "rarity": 146,
            "type": "closedEyes",
            "ranking": 165
        },
        {
            "id": 3860,
            "rarity": 146,
            "type": "thirdEye",
            "ranking": 166
        },
        {
            "id": 320,
            "rarity": 145,
            "type": "closedEyes",
            "ranking": 167
        },
        {
            "id": 414,
            "rarity": 145,
            "type": "blueTreeFrog",
            "ranking": 168
        },
        {
            "id": 1692,
            "rarity": 145,
            "type": "thirdEye",
            "ranking": 169
        },
        {
            "id": 2118,
            "rarity": 145,
            "type": "treeFrog(5)",
            "ranking": 170
        },
        {
            "id": 2413,
            "rarity": 145,
            "type": "inversedEyes",
            "ranking": 171
        },
        {
            "id": 3949,
            "rarity": 145,
            "type": "thirdEye",
            "ranking": 172
        },
        {
            "id": 360,
            "rarity": 144,
            "type": "closedEyes",
            "ranking": 173
        },
        {
            "id": 1052,
            "rarity": 144,
            "type": "closedEyes",
            "ranking": 174
        },
        {
            "id": 29,
            "rarity": 143,
            "type": "blueTreeFrog",
            "ranking": 175
        },
        {
            "id": 66,
            "rarity": 143,
            "type": "closedEyes",
            "ranking": 176
        },
        {
            "id": 69,
            "rarity": 143,
            "type": "closedEyes",
            "ranking": 177
        },
        {
            "id": 1295,
            "rarity": 143,
            "type": "greenTreeFrog",
            "ranking": 178
        },
        {
            "id": 1526,
            "rarity": 143,
            "type": "stawberryDartFrog",
            "ranking": 179
        },
        {
            "id": 2401,
            "rarity": 143,
            "type": "croaking",
            "ranking": 180
        },
        {
            "id": 2784,
            "rarity": 143,
            "type": "closedEyes",
            "ranking": 181
        },
        {
            "id": 3869,
            "rarity": 143,
            "type": "thirdEye",
            "ranking": 182
        },
        {
            "id": 628,
            "rarity": 142,
            "type": "pinkTreeFrog",
            "ranking": 183
        },
        {
            "id": 630,
            "rarity": 142,
            "type": "croaking",
            "ranking": 184
        },
        {
            "id": 1567,
            "rarity": 142,
            "type": "closedEyes",
            "ranking": 185
        },
        {
            "id": 2066,
            "rarity": 142,
            "type": "lightBrownTreeFrog",
            "ranking": 186
        },
        {
            "id": 2787,
            "rarity": 142,
            "type": "goldenTreeFrog",
            "ranking": 187
        },
        {
            "id": 269,
            "rarity": 141,
            "type": "croaking",
            "ranking": 188
        },
        {
            "id": 687,
            "rarity": 141,
            "type": "closedEyes",
            "ranking": 189
        },
        {
            "id": 724,
            "rarity": 141,
            "type": "closedEyes",
            "ranking": 190
        },
        {
            "id": 793,
            "rarity": 141,
            "type": "closedEyes",
            "ranking": 191
        },
        {
            "id": 994,
            "rarity": 141,
            "type": "croaking",
            "ranking": 192
        },
        {
            "id": 1282,
            "rarity": 141,
            "type": "closedEyes",
            "ranking": 193
        },
        {
            "id": 1283,
            "rarity": 141,
            "type": "closedEyes",
            "ranking": 194
        },
        {
            "id": 2192,
            "rarity": 141,
            "type": "closedEyes",
            "ranking": 195
        },
        {
            "id": 2794,
            "rarity": 141,
            "type": "closedEyes",
            "ranking": 196
        },
        {
            "id": 2962,
            "rarity": 141,
            "type": "closedEyes",
            "ranking": 197
        },
        {
            "id": 91,
            "rarity": 140,
            "type": "croaking",
            "ranking": 198
        },
        {
            "id": 1249,
            "rarity": 140,
            "type": "treeFrog(8)",
            "ranking": 199
        },
        {
            "id": 2146,
            "rarity": 140,
            "type": "closedEyes",
            "ranking": 200
        },
        {
            "id": 3047,
            "rarity": 140,
            "type": "closedEyes",
            "ranking": 201
        },
        {
            "id": 3288,
            "rarity": 140,
            "type": "croaking",
            "ranking": 202
        },
        {
            "id": 3476,
            "rarity": 140,
            "type": "croaking",
            "ranking": 203
        },
        {
            "id": 3836,
            "rarity": 140,
            "type": "goldenDartFrog",
            "ranking": 204
        },
        {
            "id": 333,
            "rarity": 139,
            "type": "closedEyes",
            "ranking": 205
        },
        {
            "id": 512,
            "rarity": 139,
            "type": "closedEyes",
            "ranking": 206
        },
        {
            "id": 1391,
            "rarity": 139,
            "type": "blueTreeFrog",
            "ranking": 207
        },
        {
            "id": 1488,
            "rarity": 139,
            "type": "closedEyes",
            "ranking": 208
        },
        {
            "id": 1988,
            "rarity": 139,
            "type": "treeFrog(6)",
            "ranking": 209
        },
        {
            "id": 3632,
            "rarity": 139,
            "type": "croaking",
            "ranking": 210
        },
        {
            "id": 105,
            "rarity": 138,
            "type": "croaking",
            "ranking": 211
        },
        {
            "id": 543,
            "rarity": 138,
            "type": "croaking",
            "ranking": 212
        },
        {
            "id": 935,
            "rarity": 138,
            "type": "croaking",
            "ranking": 213
        },
        {
            "id": 974,
            "rarity": 138,
            "type": "croaking",
            "ranking": 214
        },
        {
            "id": 1368,
            "rarity": 138,
            "type": "croaking",
            "ranking": 215
        },
        {
            "id": 1871,
            "rarity": 138,
            "type": "croaking",
            "ranking": 216
        },
        {
            "id": 2246,
            "rarity": 138,
            "type": "croaking",
            "ranking": 217
        },
        {
            "id": 2276,
            "rarity": 138,
            "type": "croaking",
            "ranking": 218
        },
        {
            "id": 2775,
            "rarity": 138,
            "type": "closedEyes",
            "ranking": 219
        },
        {
            "id": 3253,
            "rarity": 138,
            "type": "grayTreeFrog",
            "ranking": 220
        },
        {
            "id": 12,
            "rarity": 137,
            "type": "treeFrog(5)",
            "ranking": 221
        },
        {
            "id": 1673,
            "rarity": 137,
            "type": "croaking",
            "ranking": 222
        },
        {
            "id": 1831,
            "rarity": 137,
            "type": "thirdEye",
            "ranking": 223
        },
        {
            "id": 1987,
            "rarity": 137,
            "type": "splendidLeafFrog",
            "ranking": 224
        },
        {
            "id": 3232,
            "rarity": 137,
            "type": "closedEyes",
            "ranking": 225
        },
        {
            "id": 3376,
            "rarity": 137,
            "type": "closedEyes",
            "ranking": 226
        },
        {
            "id": 3483,
            "rarity": 137,
            "type": "croaking",
            "ranking": 227
        },
        {
            "id": 882,
            "rarity": 136,
            "type": "closedEyes",
            "ranking": 228
        },
        {
            "id": 1484,
            "rarity": 136,
            "type": "closedEyes",
            "ranking": 229
        },
        {
            "id": 1717,
            "rarity": 136,
            "type": "croaking",
            "ranking": 230
        },
        {
            "id": 1863,
            "rarity": 136,
            "type": "treeFrog(8)",
            "ranking": 231
        },
        {
            "id": 2189,
            "rarity": 136,
            "type": "treeFrog(7)",
            "ranking": 232
        },
        {
            "id": 2875,
            "rarity": 136,
            "type": "closedEyes",
            "ranking": 233
        },
        {
            "id": 3213,
            "rarity": 136,
            "type": "croaking",
            "ranking": 234
        },
        {
            "id": 3990,
            "rarity": 136,
            "type": "croaking",
            "ranking": 235
        },
        {
            "id": 2871,
            "rarity": 135,
            "type": "treeFrog(7)",
            "ranking": 236
        },
        {
            "id": 206,
            "rarity": 134,
            "type": "croaking",
            "ranking": 237
        },
        {
            "id": 388,
            "rarity": 134,
            "type": "croaking",
            "ranking": 238
        },
        {
            "id": 857,
            "rarity": 134,
            "type": "closedEyes",
            "ranking": 239
        },
        {
            "id": 2002,
            "rarity": 134,
            "type": "splendidLeafFrog",
            "ranking": 240
        },
        {
            "id": 3040,
            "rarity": 134,
            "type": "treeFrog(1)",
            "ranking": 241
        },
        {
            "id": 3320,
            "rarity": 134,
            "type": "treeFrog(8)",
            "ranking": 242
        },
        {
            "id": 3519,
            "rarity": 134,
            "type": "treeFrog(8)",
            "ranking": 243
        },
        {
            "id": 3995,
            "rarity": 134,
            "type": "lightBrownTreeFrog",
            "ranking": 244
        },
        {
            "id": 608,
            "rarity": 133,
            "type": "croaking",
            "ranking": 245
        },
        {
            "id": 1338,
            "rarity": 133,
            "type": "goldenTreeFrog",
            "ranking": 246
        },
        {
            "id": 1361,
            "rarity": 133,
            "type": "goldenTreeFrog",
            "ranking": 247
        },
        {
            "id": 1821,
            "rarity": 133,
            "type": "goldenTreeFrog",
            "ranking": 248
        },
        {
            "id": 3204,
            "rarity": 133,
            "type": "croaking",
            "ranking": 249
        },
        {
            "id": 3703,
            "rarity": 133,
            "type": "lightBrownTreeFrog",
            "ranking": 250
        },
        {
            "id": 629,
            "rarity": 132,
            "type": "inversedEyes",
            "ranking": 251
        },
        {
            "id": 796,
            "rarity": 132,
            "type": "treeFrog(1)",
            "ranking": 252
        },
        {
            "id": 1800,
            "rarity": 132,
            "type": "goldenTreeFrog",
            "ranking": 253
        },
        {
            "id": 2024,
            "rarity": 132,
            "type": "purpleTreeFrog",
            "ranking": 254
        },
        {
            "id": 2297,
            "rarity": 132,
            "type": "goldenDartFrog",
            "ranking": 255
        },
        {
            "id": 2467,
            "rarity": 132,
            "type": "treeFrog(4)",
            "ranking": 256
        },
        {
            "id": 2942,
            "rarity": 132,
            "type": "splendidLeafFrog",
            "ranking": 257
        },
        {
            "id": 241,
            "rarity": 131,
            "type": "goldenTreeFrog",
            "ranking": 258
        },
        {
            "id": 318,
            "rarity": 131,
            "type": "croaking",
            "ranking": 259
        },
        {
            "id": 387,
            "rarity": 131,
            "type": "goldenTreeFrog",
            "ranking": 260
        },
        {
            "id": 1693,
            "rarity": 131,
            "type": "splendidLeafFrog",
            "ranking": 261
        },
        {
            "id": 1714,
            "rarity": 131,
            "type": "treeFrog(1)",
            "ranking": 262
        },
        {
            "id": 2180,
            "rarity": 131,
            "type": "goldenTreeFrog",
            "ranking": 263
        },
        {
            "id": 2460,
            "rarity": 131,
            "type": "lightBrownTreeFrog",
            "ranking": 264
        },
        {
            "id": 3072,
            "rarity": 131,
            "type": "splendidLeafFrog",
            "ranking": 265
        },
        {
            "id": 3521,
            "rarity": 131,
            "type": "goldenTreeFrog",
            "ranking": 266
        },
        {
            "id": 3804,
            "rarity": 131,
            "type": "blueDartFrog",
            "ranking": 267
        },
        {
            "id": 16,
            "rarity": 130,
            "type": "purpleTreeFrog",
            "ranking": 268
        },
        {
            "id": 202,
            "rarity": 130,
            "type": "thirdEye",
            "ranking": 269
        },
        {
            "id": 1012,
            "rarity": 130,
            "type": "splendidLeafFrog",
            "ranking": 270
        },
        {
            "id": 1202,
            "rarity": 130,
            "type": "blueDartFrog",
            "ranking": 271
        },
        {
            "id": 1465,
            "rarity": 130,
            "type": "inversedEyes",
            "ranking": 272
        },
        {
            "id": 1731,
            "rarity": 130,
            "type": "stawberryDartFrog",
            "ranking": 273
        },
        {
            "id": 1849,
            "rarity": 130,
            "type": "goldenTreeFrog",
            "ranking": 274
        },
        {
            "id": 3254,
            "rarity": 130,
            "type": "splendidLeafFrog",
            "ranking": 275
        },
        {
            "id": 3469,
            "rarity": 130,
            "type": "goldenTreeFrog",
            "ranking": 276
        },
        {
            "id": 3789,
            "rarity": 130,
            "type": "goldenTreeFrog",
            "ranking": 277
        },
        {
            "id": 421,
            "rarity": 129,
            "type": "treeFrog(7)",
            "ranking": 278
        },
        {
            "id": 773,
            "rarity": 129,
            "type": "cyanTreeFrog",
            "ranking": 279
        },
        {
            "id": 1345,
            "rarity": 129,
            "type": "goldenTreeFrog",
            "ranking": 280
        },
        {
            "id": 1964,
            "rarity": 129,
            "type": "goldenTreeFrog",
            "ranking": 281
        },
        {
            "id": 2293,
            "rarity": 129,
            "type": "inversedEyes",
            "ranking": 282
        },
        {
            "id": 2372,
            "rarity": 129,
            "type": "orangeTreeFrog",
            "ranking": 283
        },
        {
            "id": 2394,
            "rarity": 129,
            "type": "goldenTreeFrog",
            "ranking": 284
        },
        {
            "id": 3496,
            "rarity": 129,
            "type": "splendidLeafFrog",
            "ranking": 285
        },
        {
            "id": 3772,
            "rarity": 129,
            "type": "goldenTreeFrog",
            "ranking": 286
        },
        {
            "id": 111,
            "rarity": 128,
            "type": "goldenTreeFrog",
            "ranking": 287
        },
        {
            "id": 1473,
            "rarity": 128,
            "type": "splendidLeafFrog",
            "ranking": 288
        },
        {
            "id": 1550,
            "rarity": 128,
            "type": "splendidLeafFrog",
            "ranking": 289
        },
        {
            "id": 1861,
            "rarity": 128,
            "type": "thirdEye",
            "ranking": 290
        },
        {
            "id": 2473,
            "rarity": 128,
            "type": "treeFrog(8)",
            "ranking": 291
        },
        {
            "id": 2644,
            "rarity": 128,
            "type": "goldenTreeFrog",
            "ranking": 292
        },
        {
            "id": 2838,
            "rarity": 128,
            "type": "unknown",
            "ranking": 293
        },
        {
            "id": 2892,
            "rarity": 128,
            "type": "blueTreeFrog",
            "ranking": 294
        },
        {
            "id": 2993,
            "rarity": 128,
            "type": "cyanTreeFrog",
            "ranking": 295
        },
        {
            "id": 3242,
            "rarity": 128,
            "type": "orangeTreeFrog",
            "ranking": 296
        },
        {
            "id": 3829,
            "rarity": 128,
            "type": "goldenTreeFrog",
            "ranking": 297
        },
        {
            "id": 31,
            "rarity": 127,
            "type": "goldenTreeFrog",
            "ranking": 298
        },
        {
            "id": 914,
            "rarity": 127,
            "type": "splendidLeafFrog",
            "ranking": 299
        },
        {
            "id": 1290,
            "rarity": 127,
            "type": "inversedEyes",
            "ranking": 300
        },
        {
            "id": 1460,
            "rarity": 127,
            "type": "purpleTreeFrog",
            "ranking": 301
        },
        {
            "id": 2124,
            "rarity": 127,
            "type": "splendidLeafFrog",
            "ranking": 302
        },
        {
            "id": 2438,
            "rarity": 127,
            "type": "splendidLeafFrog",
            "ranking": 303
        },
        {
            "id": 2449,
            "rarity": 127,
            "type": "blueTreeFrog",
            "ranking": 304
        },
        {
            "id": 2541,
            "rarity": 127,
            "type": "greenTreeFrog",
            "ranking": 305
        },
        {
            "id": 3025,
            "rarity": 127,
            "type": "grayTreeFrog",
            "ranking": 306
        },
        {
            "id": 3181,
            "rarity": 127,
            "type": "thirdEye",
            "ranking": 307
        },
        {
            "id": 3547,
            "rarity": 127,
            "type": "treeFrog(2)",
            "ranking": 308
        },
        {
            "id": 3623,
            "rarity": 127,
            "type": "unknown",
            "ranking": 309
        },
        {
            "id": 3832,
            "rarity": 127,
            "type": "blueDartFrog",
            "ranking": 310
        },
        {
            "id": 3921,
            "rarity": 127,
            "type": "splendidLeafFrog",
            "ranking": 311
        },
        {
            "id": 223,
            "rarity": 126,
            "type": "cyanTreeFrog",
            "ranking": 312
        },
        {
            "id": 823,
            "rarity": 126,
            "type": "grayTreeFrog",
            "ranking": 313
        },
        {
            "id": 1001,
            "rarity": 126,
            "type": "treeFrog(1)",
            "ranking": 314
        },
        {
            "id": 1380,
            "rarity": 126,
            "type": "treeFrog(1)",
            "ranking": 315
        },
        {
            "id": 1925,
            "rarity": 126,
            "type": "treeFrog(1)",
            "ranking": 316
        },
        {
            "id": 2097,
            "rarity": 126,
            "type": "goldenDartFrog",
            "ranking": 317
        },
        {
            "id": 2725,
            "rarity": 126,
            "type": "splendidLeafFrog",
            "ranking": 318
        },
        {
            "id": 2847,
            "rarity": 126,
            "type": "greenTreeFrog",
            "ranking": 319
        },
        {
            "id": 2956,
            "rarity": 126,
            "type": "splendidLeafFrog",
            "ranking": 320
        },
        {
            "id": 3051,
            "rarity": 126,
            "type": "treeFrog(1)",
            "ranking": 321
        },
        {
            "id": 3079,
            "rarity": 126,
            "type": "greenTreeFrog",
            "ranking": 322
        },
        {
            "id": 3465,
            "rarity": 126,
            "type": "unknown",
            "ranking": 323
        },
        {
            "id": 3753,
            "rarity": 126,
            "type": "splendidLeafFrog",
            "ranking": 324
        },
        {
            "id": 3905,
            "rarity": 126,
            "type": "splendidLeafFrog",
            "ranking": 325
        },
        {
            "id": 61,
            "rarity": 125,
            "type": "treeFrog(1)",
            "ranking": 326
        },
        {
            "id": 132,
            "rarity": 125,
            "type": "stawberryDartFrog",
            "ranking": 327
        },
        {
            "id": 718,
            "rarity": 125,
            "type": "treeFrog(1)",
            "ranking": 328
        },
        {
            "id": 918,
            "rarity": 125,
            "type": "goldenDartFrog",
            "ranking": 329
        },
        {
            "id": 995,
            "rarity": 125,
            "type": "purpleTreeFrog",
            "ranking": 330
        },
        {
            "id": 1017,
            "rarity": 125,
            "type": "purpleTreeFrog",
            "ranking": 331
        },
        {
            "id": 1063,
            "rarity": 125,
            "type": "pinkTreeFrog",
            "ranking": 332
        },
        {
            "id": 1163,
            "rarity": 125,
            "type": "purpleTreeFrog",
            "ranking": 333
        },
        {
            "id": 1366,
            "rarity": 125,
            "type": "purpleTreeFrog",
            "ranking": 334
        },
        {
            "id": 1538,
            "rarity": 125,
            "type": "redEyedTreeFrog",
            "ranking": 335
        },
        {
            "id": 1687,
            "rarity": 125,
            "type": "splendidLeafFrog",
            "ranking": 336
        },
        {
            "id": 1789,
            "rarity": 125,
            "type": "goldenDartFrog",
            "ranking": 337
        },
        {
            "id": 1892,
            "rarity": 125,
            "type": "thirdEye",
            "ranking": 338
        },
        {
            "id": 2020,
            "rarity": 125,
            "type": "purpleTreeFrog",
            "ranking": 339
        },
        {
            "id": 2519,
            "rarity": 125,
            "type": "splendidLeafFrog",
            "ranking": 340
        },
        {
            "id": 2711,
            "rarity": 125,
            "type": "splendidLeafFrog",
            "ranking": 341
        },
        {
            "id": 2967,
            "rarity": 125,
            "type": "treeFrog(1)",
            "ranking": 342
        },
        {
            "id": 3386,
            "rarity": 125,
            "type": "treeFrog(1)",
            "ranking": 343
        },
        {
            "id": 3411,
            "rarity": 125,
            "type": "purpleTreeFrog",
            "ranking": 344
        },
        {
            "id": 3591,
            "rarity": 125,
            "type": "splendidLeafFrog",
            "ranking": 345
        },
        {
            "id": 3733,
            "rarity": 125,
            "type": "pinkTreeFrog",
            "ranking": 346
        },
        {
            "id": 3866,
            "rarity": 125,
            "type": "goldenTreeFrog",
            "ranking": 347
        },
        {
            "id": 28,
            "rarity": 124,
            "type": "blueTreeFrog",
            "ranking": 348
        },
        {
            "id": 80,
            "rarity": 124,
            "type": "unknown",
            "ranking": 349
        },
        {
            "id": 171,
            "rarity": 124,
            "type": "greenTreeFrog",
            "ranking": 350
        },
        {
            "id": 220,
            "rarity": 124,
            "type": "treeFrog(1)",
            "ranking": 351
        },
        {
            "id": 438,
            "rarity": 124,
            "type": "goldenDartFrog",
            "ranking": 352
        },
        {
            "id": 470,
            "rarity": 124,
            "type": "tomatoFrog",
            "ranking": 353
        },
        {
            "id": 541,
            "rarity": 124,
            "type": "splendidLeafFrog",
            "ranking": 354
        },
        {
            "id": 542,
            "rarity": 124,
            "type": "treeFrog(1)",
            "ranking": 355
        },
        {
            "id": 752,
            "rarity": 124,
            "type": "goldenDartFrog",
            "ranking": 356
        },
        {
            "id": 993,
            "rarity": 124,
            "type": "treeFrog(1)",
            "ranking": 357
        },
        {
            "id": 1000,
            "rarity": 124,
            "type": "treeFrog(1)",
            "ranking": 358
        },
        {
            "id": 1118,
            "rarity": 124,
            "type": "treeFrog(1)",
            "ranking": 359
        },
        {
            "id": 1177,
            "rarity": 124,
            "type": "splendidLeafFrog",
            "ranking": 360
        },
        {
            "id": 1727,
            "rarity": 124,
            "type": "orangeTreeFrog",
            "ranking": 361
        },
        {
            "id": 1985,
            "rarity": 124,
            "type": "splendidLeafFrog",
            "ranking": 362
        },
        {
            "id": 1993,
            "rarity": 124,
            "type": "treeFrog(4)",
            "ranking": 363
        },
        {
            "id": 2238,
            "rarity": 124,
            "type": "redEyedTreeFrog",
            "ranking": 364
        },
        {
            "id": 2239,
            "rarity": 124,
            "type": "blueDartFrog",
            "ranking": 365
        },
        {
            "id": 2266,
            "rarity": 124,
            "type": "orangeTreeFrog",
            "ranking": 366
        },
        {
            "id": 2270,
            "rarity": 124,
            "type": "splendidLeafFrog",
            "ranking": 367
        },
        {
            "id": 2279,
            "rarity": 124,
            "type": "blueTreeFrog",
            "ranking": 368
        },
        {
            "id": 2331,
            "rarity": 124,
            "type": "pinkTreeFrog",
            "ranking": 369
        },
        {
            "id": 2431,
            "rarity": 124,
            "type": "purpleTreeFrog",
            "ranking": 370
        },
        {
            "id": 2490,
            "rarity": 124,
            "type": "goldenDartFrog",
            "ranking": 371
        },
        {
            "id": 2736,
            "rarity": 124,
            "type": "goldenDartFrog",
            "ranking": 372
        },
        {
            "id": 2843,
            "rarity": 124,
            "type": "splendidLeafFrog",
            "ranking": 373
        },
        {
            "id": 2846,
            "rarity": 124,
            "type": "greenTreeFrog",
            "ranking": 374
        },
        {
            "id": 3321,
            "rarity": 124,
            "type": "purpleTreeFrog",
            "ranking": 375
        },
        {
            "id": 3423,
            "rarity": 124,
            "type": "splendidLeafFrog",
            "ranking": 376
        },
        {
            "id": 3600,
            "rarity": 124,
            "type": "treeFrog(1)",
            "ranking": 377
        },
        {
            "id": 3762,
            "rarity": 124,
            "type": "purpleTreeFrog",
            "ranking": 378
        },
        {
            "id": 3873,
            "rarity": 124,
            "type": "greenTreeFrog",
            "ranking": 379
        },
        {
            "id": 19,
            "rarity": 123,
            "type": "cyanTreeFrog",
            "ranking": 380
        },
        {
            "id": 20,
            "rarity": 123,
            "type": "lightBrownTreeFrog",
            "ranking": 381
        },
        {
            "id": 48,
            "rarity": 123,
            "type": "blueTreeFrog",
            "ranking": 382
        },
        {
            "id": 186,
            "rarity": 123,
            "type": "purpleTreeFrog",
            "ranking": 383
        },
        {
            "id": 205,
            "rarity": 123,
            "type": "purpleTreeFrog",
            "ranking": 384
        },
        {
            "id": 454,
            "rarity": 123,
            "type": "treeFrog(1)",
            "ranking": 385
        },
        {
            "id": 553,
            "rarity": 123,
            "type": "treeFrog(8)",
            "ranking": 386
        },
        {
            "id": 581,
            "rarity": 123,
            "type": "inversedEyes",
            "ranking": 387
        },
        {
            "id": 700,
            "rarity": 123,
            "type": "blueDartFrog",
            "ranking": 388
        },
        {
            "id": 906,
            "rarity": 123,
            "type": "purpleTreeFrog",
            "ranking": 389
        },
        {
            "id": 988,
            "rarity": 123,
            "type": "purpleTreeFrog",
            "ranking": 390
        },
        {
            "id": 1286,
            "rarity": 123,
            "type": "treeFrog(1)",
            "ranking": 391
        },
        {
            "id": 1301,
            "rarity": 123,
            "type": "orangeTreeFrog",
            "ranking": 392
        },
        {
            "id": 1315,
            "rarity": 123,
            "type": "treeFrog(1)",
            "ranking": 393
        },
        {
            "id": 1316,
            "rarity": 123,
            "type": "stawberryDartFrog",
            "ranking": 394
        },
        {
            "id": 1586,
            "rarity": 123,
            "type": "purpleTreeFrog",
            "ranking": 395
        },
        {
            "id": 2021,
            "rarity": 123,
            "type": "pinkTreeFrog",
            "ranking": 396
        },
        {
            "id": 2898,
            "rarity": 123,
            "type": "treeFrog(1)",
            "ranking": 397
        },
        {
            "id": 3054,
            "rarity": 123,
            "type": "orangeTreeFrog",
            "ranking": 398
        },
        {
            "id": 3071,
            "rarity": 123,
            "type": "inversedEyes",
            "ranking": 399
        },
        {
            "id": 3132,
            "rarity": 123,
            "type": "tomatoFrog",
            "ranking": 400
        },
        {
            "id": 3280,
            "rarity": 123,
            "type": "pinkTreeFrog",
            "ranking": 401
        },
        {
            "id": 3533,
            "rarity": 123,
            "type": "pinkTreeFrog",
            "ranking": 402
        },
        {
            "id": 73,
            "rarity": 122,
            "type": "lightBrownTreeFrog",
            "ranking": 403
        },
        {
            "id": 133,
            "rarity": 122,
            "type": "treeFrog(1)",
            "ranking": 404
        },
        {
            "id": 369,
            "rarity": 122,
            "type": "pinkTreeFrog",
            "ranking": 405
        },
        {
            "id": 516,
            "rarity": 122,
            "type": "unknown",
            "ranking": 406
        },
        {
            "id": 702,
            "rarity": 122,
            "type": "treeFrog(1)",
            "ranking": 407
        },
        {
            "id": 969,
            "rarity": 122,
            "type": "purpleTreeFrog",
            "ranking": 408
        },
        {
            "id": 1241,
            "rarity": 122,
            "type": "grayTreeFrog",
            "ranking": 409
        },
        {
            "id": 1245,
            "rarity": 122,
            "type": "goldenDartFrog",
            "ranking": 410
        },
        {
            "id": 1462,
            "rarity": 122,
            "type": "treeFrog(1)",
            "ranking": 411
        },
        {
            "id": 1582,
            "rarity": 122,
            "type": "purpleTreeFrog",
            "ranking": 412
        },
        {
            "id": 1784,
            "rarity": 122,
            "type": "blueDartFrog",
            "ranking": 413
        },
        {
            "id": 1833,
            "rarity": 122,
            "type": "tomatoFrog",
            "ranking": 414
        },
        {
            "id": 1840,
            "rarity": 122,
            "type": "goldenTreeFrog",
            "ranking": 415
        },
        {
            "id": 1980,
            "rarity": 122,
            "type": "purpleTreeFrog",
            "ranking": 416
        },
        {
            "id": 2037,
            "rarity": 122,
            "type": "cyanTreeFrog",
            "ranking": 417
        },
        {
            "id": 2167,
            "rarity": 122,
            "type": "cyanTreeFrog",
            "ranking": 418
        },
        {
            "id": 2254,
            "rarity": 122,
            "type": "orangeTreeFrog",
            "ranking": 419
        },
        {
            "id": 2368,
            "rarity": 122,
            "type": "goldenDartFrog",
            "ranking": 420
        },
        {
            "id": 2382,
            "rarity": 122,
            "type": "blueDartFrog",
            "ranking": 421
        },
        {
            "id": 2384,
            "rarity": 122,
            "type": "purpleTreeFrog",
            "ranking": 422
        },
        {
            "id": 2713,
            "rarity": 122,
            "type": "redEyedTreeFrog",
            "ranking": 423
        },
        {
            "id": 2870,
            "rarity": 122,
            "type": "stawberryDartFrog",
            "ranking": 424
        },
        {
            "id": 2908,
            "rarity": 122,
            "type": "inversedEyes",
            "ranking": 425
        },
        {
            "id": 3023,
            "rarity": 122,
            "type": "orangeTreeFrog",
            "ranking": 426
        },
        {
            "id": 3027,
            "rarity": 122,
            "type": "tomatoFrog",
            "ranking": 427
        },
        {
            "id": 3233,
            "rarity": 122,
            "type": "goldenDartFrog",
            "ranking": 428
        },
        {
            "id": 3377,
            "rarity": 122,
            "type": "greenTreeFrog",
            "ranking": 429
        },
        {
            "id": 3883,
            "rarity": 122,
            "type": "pinkTreeFrog",
            "ranking": 430
        },
        {
            "id": 3902,
            "rarity": 122,
            "type": "tomatoFrog",
            "ranking": 431
        },
        {
            "id": 4015,
            "rarity": 122,
            "type": "treeFrog(1)",
            "ranking": 432
        },
        {
            "id": 172,
            "rarity": 121,
            "type": "orangeTreeFrog",
            "ranking": 433
        },
        {
            "id": 252,
            "rarity": 121,
            "type": "orangeTreeFrog",
            "ranking": 434
        },
        {
            "id": 453,
            "rarity": 121,
            "type": "tomatoFrog",
            "ranking": 435
        },
        {
            "id": 758,
            "rarity": 121,
            "type": "blueDartFrog",
            "ranking": 436
        },
        {
            "id": 1060,
            "rarity": 121,
            "type": "pinkTreeFrog",
            "ranking": 437
        },
        {
            "id": 1093,
            "rarity": 121,
            "type": "unknown",
            "ranking": 438
        },
        {
            "id": 1198,
            "rarity": 121,
            "type": "stawberryDartFrog",
            "ranking": 439
        },
        {
            "id": 1239,
            "rarity": 121,
            "type": "treeFrog(1)",
            "ranking": 440
        },
        {
            "id": 1277,
            "rarity": 121,
            "type": "blueDartFrog",
            "ranking": 441
        },
        {
            "id": 1498,
            "rarity": 121,
            "type": "thirdEye",
            "ranking": 442
        },
        {
            "id": 1540,
            "rarity": 121,
            "type": "stawberryDartFrog",
            "ranking": 443
        },
        {
            "id": 1591,
            "rarity": 121,
            "type": "blueTreeFrog",
            "ranking": 444
        },
        {
            "id": 1607,
            "rarity": 121,
            "type": "goldenDartFrog",
            "ranking": 445
        },
        {
            "id": 1713,
            "rarity": 121,
            "type": "purpleTreeFrog",
            "ranking": 446
        },
        {
            "id": 1737,
            "rarity": 121,
            "type": "splendidLeafFrog",
            "ranking": 447
        },
        {
            "id": 1880,
            "rarity": 121,
            "type": "stawberryDartFrog",
            "ranking": 448
        },
        {
            "id": 2049,
            "rarity": 121,
            "type": "orangeTreeFrog",
            "ranking": 449
        },
        {
            "id": 2079,
            "rarity": 121,
            "type": "unknown",
            "ranking": 450
        },
        {
            "id": 2205,
            "rarity": 121,
            "type": "orangeTreeFrog",
            "ranking": 451
        },
        {
            "id": 2410,
            "rarity": 121,
            "type": "goldenDartFrog",
            "ranking": 452
        },
        {
            "id": 2745,
            "rarity": 121,
            "type": "orangeTreeFrog",
            "ranking": 453
        },
        {
            "id": 2834,
            "rarity": 121,
            "type": "orangeTreeFrog",
            "ranking": 454
        },
        {
            "id": 2889,
            "rarity": 121,
            "type": "blueDartFrog",
            "ranking": 455
        },
        {
            "id": 2938,
            "rarity": 121,
            "type": "blueDartFrog",
            "ranking": 456
        },
        {
            "id": 2992,
            "rarity": 121,
            "type": "pinkTreeFrog",
            "ranking": 457
        },
        {
            "id": 3129,
            "rarity": 121,
            "type": "orangeTreeFrog",
            "ranking": 458
        },
        {
            "id": 3240,
            "rarity": 121,
            "type": "orangeTreeFrog",
            "ranking": 459
        },
        {
            "id": 3329,
            "rarity": 121,
            "type": "cyanTreeFrog",
            "ranking": 460
        },
        {
            "id": 3358,
            "rarity": 121,
            "type": "thirdEye",
            "ranking": 461
        },
        {
            "id": 3412,
            "rarity": 121,
            "type": "purpleTreeFrog",
            "ranking": 462
        },
        {
            "id": 3459,
            "rarity": 121,
            "type": "closedEyes",
            "ranking": 463
        },
        {
            "id": 3498,
            "rarity": 121,
            "type": "purpleTreeFrog",
            "ranking": 464
        },
        {
            "id": 3525,
            "rarity": 121,
            "type": "inversedEyes",
            "ranking": 465
        },
        {
            "id": 3568,
            "rarity": 121,
            "type": "pinkTreeFrog",
            "ranking": 466
        },
        {
            "id": 3579,
            "rarity": 121,
            "type": "treeFrog(1)",
            "ranking": 467
        },
        {
            "id": 3639,
            "rarity": 121,
            "type": "pinkTreeFrog",
            "ranking": 468
        },
        {
            "id": 3696,
            "rarity": 121,
            "type": "stawberryDartFrog",
            "ranking": 469
        },
        {
            "id": 3749,
            "rarity": 121,
            "type": "orangeTreeFrog",
            "ranking": 470
        },
        {
            "id": 255,
            "rarity": 120,
            "type": "grayTreeFrog",
            "ranking": 471
        },
        {
            "id": 259,
            "rarity": 120,
            "type": "brownTreeFrog",
            "ranking": 472
        },
        {
            "id": 398,
            "rarity": 120,
            "type": "grayTreeFrog",
            "ranking": 473
        },
        {
            "id": 511,
            "rarity": 120,
            "type": "purpleTreeFrog",
            "ranking": 474
        },
        {
            "id": 546,
            "rarity": 120,
            "type": "splendidLeafFrog",
            "ranking": 475
        },
        {
            "id": 638,
            "rarity": 120,
            "type": "greenTreeFrog",
            "ranking": 476
        },
        {
            "id": 953,
            "rarity": 120,
            "type": "tomatoFrog",
            "ranking": 477
        },
        {
            "id": 1091,
            "rarity": 120,
            "type": "orangeTreeFrog",
            "ranking": 478
        },
        {
            "id": 1300,
            "rarity": 120,
            "type": "pinkTreeFrog",
            "ranking": 479
        },
        {
            "id": 1360,
            "rarity": 120,
            "type": "grayTreeFrog",
            "ranking": 480
        },
        {
            "id": 1388,
            "rarity": 120,
            "type": "unknown",
            "ranking": 481
        },
        {
            "id": 1596,
            "rarity": 120,
            "type": "blueDartFrog",
            "ranking": 482
        },
        {
            "id": 1649,
            "rarity": 120,
            "type": "stawberryDartFrog",
            "ranking": 483
        },
        {
            "id": 1904,
            "rarity": 120,
            "type": "blueTreeFrog",
            "ranking": 484
        },
        {
            "id": 1939,
            "rarity": 120,
            "type": "stawberryDartFrog",
            "ranking": 485
        },
        {
            "id": 1942,
            "rarity": 120,
            "type": "grayTreeFrog",
            "ranking": 486
        },
        {
            "id": 1998,
            "rarity": 120,
            "type": "purpleTreeFrog",
            "ranking": 487
        },
        {
            "id": 2016,
            "rarity": 120,
            "type": "tomatoFrog",
            "ranking": 488
        },
        {
            "id": 2039,
            "rarity": 120,
            "type": "thirdEye",
            "ranking": 489
        },
        {
            "id": 2159,
            "rarity": 120,
            "type": "stawberryDartFrog",
            "ranking": 490
        },
        {
            "id": 2348,
            "rarity": 120,
            "type": "tomatoFrog",
            "ranking": 491
        },
        {
            "id": 2469,
            "rarity": 120,
            "type": "stawberryDartFrog",
            "ranking": 492
        },
        {
            "id": 2522,
            "rarity": 120,
            "type": "blueTreeFrog",
            "ranking": 493
        },
        {
            "id": 2525,
            "rarity": 120,
            "type": "treeFrog(1)",
            "ranking": 494
        },
        {
            "id": 2631,
            "rarity": 120,
            "type": "greenTreeFrog",
            "ranking": 495
        },
        {
            "id": 2661,
            "rarity": 120,
            "type": "brownTreeFrog",
            "ranking": 496
        },
        {
            "id": 2743,
            "rarity": 120,
            "type": "stawberryDartFrog",
            "ranking": 497
        },
        {
            "id": 2901,
            "rarity": 120,
            "type": "unknown",
            "ranking": 498
        },
        {
            "id": 3228,
            "rarity": 120,
            "type": "stawberryDartFrog",
            "ranking": 499
        },
        {
            "id": 3475,
            "rarity": 120,
            "type": "pinkTreeFrog",
            "ranking": 500
        },
        {
            "id": 3500,
            "rarity": 120,
            "type": "pinkTreeFrog",
            "ranking": 501
        },
        {
            "id": 3653,
            "rarity": 120,
            "type": "brownTreeFrog",
            "ranking": 502
        },
        {
            "id": 3732,
            "rarity": 120,
            "type": "stawberryDartFrog",
            "ranking": 503
        },
        {
            "id": 3850,
            "rarity": 120,
            "type": "grayTreeFrog",
            "ranking": 504
        },
        {
            "id": 3918,
            "rarity": 120,
            "type": "purpleTreeFrog",
            "ranking": 505
        },
        {
            "id": 3922,
            "rarity": 120,
            "type": "blueTreeFrog",
            "ranking": 506
        },
        {
            "id": 3969,
            "rarity": 120,
            "type": "tomatoFrog",
            "ranking": 507
        },
        {
            "id": 3971,
            "rarity": 120,
            "type": "purpleTreeFrog",
            "ranking": 508
        },
        {
            "id": 4032,
            "rarity": 120,
            "type": "pinkTreeFrog",
            "ranking": 509
        },
        {
            "id": 4039,
            "rarity": 120,
            "type": "greenTreeFrog",
            "ranking": 510
        },
        {
            "id": 349,
            "rarity": 119,
            "type": "unknown",
            "ranking": 511
        },
        {
            "id": 497,
            "rarity": 119,
            "type": "pinkTreeFrog",
            "ranking": 512
        },
        {
            "id": 519,
            "rarity": 119,
            "type": "treeFrog(1)",
            "ranking": 513
        },
        {
            "id": 549,
            "rarity": 119,
            "type": "pinkTreeFrog",
            "ranking": 514
        },
        {
            "id": 688,
            "rarity": 119,
            "type": "goldenDartFrog",
            "ranking": 515
        },
        {
            "id": 699,
            "rarity": 119,
            "type": "greenTreeFrog",
            "ranking": 516
        },
        {
            "id": 784,
            "rarity": 119,
            "type": "unknown",
            "ranking": 517
        },
        {
            "id": 887,
            "rarity": 119,
            "type": "greenTreeFrog",
            "ranking": 518
        },
        {
            "id": 936,
            "rarity": 119,
            "type": "orangeTreeFrog",
            "ranking": 519
        },
        {
            "id": 1008,
            "rarity": 119,
            "type": "stawberryDartFrog",
            "ranking": 520
        },
        {
            "id": 1116,
            "rarity": 119,
            "type": "goldenDartFrog",
            "ranking": 521
        },
        {
            "id": 1152,
            "rarity": 119,
            "type": "unknown",
            "ranking": 522
        },
        {
            "id": 1233,
            "rarity": 119,
            "type": "blueTreeFrog",
            "ranking": 523
        },
        {
            "id": 1236,
            "rarity": 119,
            "type": "goldenDartFrog",
            "ranking": 524
        },
        {
            "id": 1346,
            "rarity": 119,
            "type": "closedEyes",
            "ranking": 525
        },
        {
            "id": 1353,
            "rarity": 119,
            "type": "orangeTreeFrog",
            "ranking": 526
        },
        {
            "id": 1416,
            "rarity": 119,
            "type": "orangeTreeFrog",
            "ranking": 527
        },
        {
            "id": 1424,
            "rarity": 119,
            "type": "thirdEye",
            "ranking": 528
        },
        {
            "id": 1449,
            "rarity": 119,
            "type": "redEyedTreeFrog",
            "ranking": 529
        },
        {
            "id": 1559,
            "rarity": 119,
            "type": "unknown",
            "ranking": 530
        },
        {
            "id": 1614,
            "rarity": 119,
            "type": "blueDartFrog",
            "ranking": 531
        },
        {
            "id": 1724,
            "rarity": 119,
            "type": "purpleTreeFrog",
            "ranking": 532
        },
        {
            "id": 1758,
            "rarity": 119,
            "type": "grayTreeFrog",
            "ranking": 533
        },
        {
            "id": 1895,
            "rarity": 119,
            "type": "treeFrog(8)",
            "ranking": 534
        },
        {
            "id": 1917,
            "rarity": 119,
            "type": "greenTreeFrog",
            "ranking": 535
        },
        {
            "id": 2050,
            "rarity": 119,
            "type": "stawberryDartFrog",
            "ranking": 536
        },
        {
            "id": 2077,
            "rarity": 119,
            "type": "orangeTreeFrog",
            "ranking": 537
        },
        {
            "id": 2085,
            "rarity": 119,
            "type": "goldenDartFrog",
            "ranking": 538
        },
        {
            "id": 2303,
            "rarity": 119,
            "type": "grayTreeFrog",
            "ranking": 539
        },
        {
            "id": 2314,
            "rarity": 119,
            "type": "pinkTreeFrog",
            "ranking": 540
        },
        {
            "id": 2615,
            "rarity": 119,
            "type": "pinkTreeFrog",
            "ranking": 541
        },
        {
            "id": 2687,
            "rarity": 119,
            "type": "treeFrog(1)",
            "ranking": 542
        },
        {
            "id": 2700,
            "rarity": 119,
            "type": "goldenDartFrog",
            "ranking": 543
        },
        {
            "id": 2785,
            "rarity": 119,
            "type": "tomatoFrog",
            "ranking": 544
        },
        {
            "id": 2807,
            "rarity": 119,
            "type": "purpleTreeFrog",
            "ranking": 545
        },
        {
            "id": 2985,
            "rarity": 119,
            "type": "pinkTreeFrog",
            "ranking": 546
        },
        {
            "id": 3440,
            "rarity": 119,
            "type": "goldenDartFrog",
            "ranking": 547
        },
        {
            "id": 3497,
            "rarity": 119,
            "type": "goldenDartFrog",
            "ranking": 548
        },
        {
            "id": 3499,
            "rarity": 119,
            "type": "grayTreeFrog",
            "ranking": 549
        },
        {
            "id": 3571,
            "rarity": 119,
            "type": "blueTreeFrog",
            "ranking": 550
        },
        {
            "id": 3592,
            "rarity": 119,
            "type": "blueDartFrog",
            "ranking": 551
        },
        {
            "id": 3702,
            "rarity": 119,
            "type": "purpleTreeFrog",
            "ranking": 552
        },
        {
            "id": 3904,
            "rarity": 119,
            "type": "brownTreeFrog",
            "ranking": 553
        },
        {
            "id": 38,
            "rarity": 118,
            "type": "stawberryDartFrog",
            "ranking": 554
        },
        {
            "id": 102,
            "rarity": 118,
            "type": "stawberryDartFrog",
            "ranking": 555
        },
        {
            "id": 158,
            "rarity": 118,
            "type": "stawberryDartFrog",
            "ranking": 556
        },
        {
            "id": 199,
            "rarity": 118,
            "type": "stawberryDartFrog",
            "ranking": 557
        },
        {
            "id": 221,
            "rarity": 118,
            "type": "grayTreeFrog",
            "ranking": 558
        },
        {
            "id": 329,
            "rarity": 118,
            "type": "closedEyes",
            "ranking": 559
        },
        {
            "id": 336,
            "rarity": 118,
            "type": "purpleTreeFrog",
            "ranking": 560
        },
        {
            "id": 339,
            "rarity": 118,
            "type": "greenTreeFrog",
            "ranking": 561
        },
        {
            "id": 344,
            "rarity": 118,
            "type": "stawberryDartFrog",
            "ranking": 562
        },
        {
            "id": 375,
            "rarity": 118,
            "type": "pinkTreeFrog",
            "ranking": 563
        },
        {
            "id": 436,
            "rarity": 118,
            "type": "grayTreeFrog",
            "ranking": 564
        },
        {
            "id": 494,
            "rarity": 118,
            "type": "pinkTreeFrog",
            "ranking": 565
        },
        {
            "id": 653,
            "rarity": 118,
            "type": "blueDartFrog",
            "ranking": 566
        },
        {
            "id": 749,
            "rarity": 118,
            "type": "purpleTreeFrog",
            "ranking": 567
        },
        {
            "id": 822,
            "rarity": 118,
            "type": "goldenDartFrog",
            "ranking": 568
        },
        {
            "id": 943,
            "rarity": 118,
            "type": "blueDartFrog",
            "ranking": 569
        },
        {
            "id": 957,
            "rarity": 118,
            "type": "grayTreeFrog",
            "ranking": 570
        },
        {
            "id": 985,
            "rarity": 118,
            "type": "greenTreeFrog",
            "ranking": 571
        },
        {
            "id": 1075,
            "rarity": 118,
            "type": "pinkTreeFrog",
            "ranking": 572
        },
        {
            "id": 1102,
            "rarity": 118,
            "type": "goldenDartFrog",
            "ranking": 573
        },
        {
            "id": 1139,
            "rarity": 118,
            "type": "pinkTreeFrog",
            "ranking": 574
        },
        {
            "id": 1156,
            "rarity": 118,
            "type": "redEyedTreeFrog",
            "ranking": 575
        },
        {
            "id": 1205,
            "rarity": 118,
            "type": "blueDartFrog",
            "ranking": 576
        },
        {
            "id": 1218,
            "rarity": 118,
            "type": "blueDartFrog",
            "ranking": 577
        },
        {
            "id": 1234,
            "rarity": 118,
            "type": "pinkTreeFrog",
            "ranking": 578
        },
        {
            "id": 1494,
            "rarity": 118,
            "type": "grayTreeFrog",
            "ranking": 579
        },
        {
            "id": 1580,
            "rarity": 118,
            "type": "greenTreeFrog",
            "ranking": 580
        },
        {
            "id": 1675,
            "rarity": 118,
            "type": "grayTreeFrog",
            "ranking": 581
        },
        {
            "id": 1684,
            "rarity": 118,
            "type": "unknown",
            "ranking": 582
        },
        {
            "id": 1763,
            "rarity": 118,
            "type": "tomatoFrog",
            "ranking": 583
        },
        {
            "id": 1823,
            "rarity": 118,
            "type": "orangeTreeFrog",
            "ranking": 584
        },
        {
            "id": 1848,
            "rarity": 118,
            "type": "blueDartFrog",
            "ranking": 585
        },
        {
            "id": 1997,
            "rarity": 118,
            "type": "unknown",
            "ranking": 586
        },
        {
            "id": 2264,
            "rarity": 118,
            "type": "blueDartFrog",
            "ranking": 587
        },
        {
            "id": 2290,
            "rarity": 118,
            "type": "blueTreeFrog",
            "ranking": 588
        },
        {
            "id": 2424,
            "rarity": 118,
            "type": "greenTreeFrog",
            "ranking": 589
        },
        {
            "id": 2527,
            "rarity": 118,
            "type": "pinkTreeFrog",
            "ranking": 590
        },
        {
            "id": 2760,
            "rarity": 118,
            "type": "greenTreeFrog",
            "ranking": 591
        },
        {
            "id": 2804,
            "rarity": 118,
            "type": "blueDartFrog",
            "ranking": 592
        },
        {
            "id": 2995,
            "rarity": 118,
            "type": "blueTreeFrog",
            "ranking": 593
        },
        {
            "id": 2998,
            "rarity": 118,
            "type": "tomatoFrog",
            "ranking": 594
        },
        {
            "id": 3157,
            "rarity": 118,
            "type": "croaking",
            "ranking": 595
        },
        {
            "id": 3169,
            "rarity": 118,
            "type": "blueDartFrog",
            "ranking": 596
        },
        {
            "id": 3451,
            "rarity": 118,
            "type": "blueDartFrog",
            "ranking": 597
        },
        {
            "id": 3686,
            "rarity": 118,
            "type": "cyanTreeFrog",
            "ranking": 598
        },
        {
            "id": 3720,
            "rarity": 118,
            "type": "pinkTreeFrog",
            "ranking": 599
        },
        {
            "id": 95,
            "rarity": 117,
            "type": "redEyedTreeFrog",
            "ranking": 600
        },
        {
            "id": 256,
            "rarity": 117,
            "type": "blueTreeFrog",
            "ranking": 601
        },
        {
            "id": 334,
            "rarity": 117,
            "type": "blueDartFrog",
            "ranking": 602
        },
        {
            "id": 384,
            "rarity": 117,
            "type": "greenTreeFrog",
            "ranking": 603
        },
        {
            "id": 458,
            "rarity": 117,
            "type": "unknown",
            "ranking": 604
        },
        {
            "id": 476,
            "rarity": 117,
            "type": "cyanTreeFrog",
            "ranking": 605
        },
        {
            "id": 644,
            "rarity": 117,
            "type": "unknown",
            "ranking": 606
        },
        {
            "id": 681,
            "rarity": 117,
            "type": "blueTreeFrog",
            "ranking": 607
        },
        {
            "id": 683,
            "rarity": 117,
            "type": "blueDartFrog",
            "ranking": 608
        },
        {
            "id": 786,
            "rarity": 117,
            "type": "redEyedTreeFrog",
            "ranking": 609
        },
        {
            "id": 803,
            "rarity": 117,
            "type": "orangeTreeFrog",
            "ranking": 610
        },
        {
            "id": 921,
            "rarity": 117,
            "type": "tomatoFrog",
            "ranking": 611
        },
        {
            "id": 1025,
            "rarity": 117,
            "type": "tomatoFrog",
            "ranking": 612
        },
        {
            "id": 1120,
            "rarity": 117,
            "type": "redEyedTreeFrog",
            "ranking": 613
        },
        {
            "id": 1126,
            "rarity": 117,
            "type": "pinkTreeFrog",
            "ranking": 614
        },
        {
            "id": 1312,
            "rarity": 117,
            "type": "blueDartFrog",
            "ranking": 615
        },
        {
            "id": 1331,
            "rarity": 117,
            "type": "unknown",
            "ranking": 616
        },
        {
            "id": 1571,
            "rarity": 117,
            "type": "redEyedTreeFrog",
            "ranking": 617
        },
        {
            "id": 1708,
            "rarity": 117,
            "type": "blueDartFrog",
            "ranking": 618
        },
        {
            "id": 1709,
            "rarity": 117,
            "type": "redEyedTreeFrog",
            "ranking": 619
        },
        {
            "id": 1836,
            "rarity": 117,
            "type": "lightBrownTreeFrog",
            "ranking": 620
        },
        {
            "id": 1859,
            "rarity": 117,
            "type": "redEyedTreeFrog",
            "ranking": 621
        },
        {
            "id": 2044,
            "rarity": 117,
            "type": "treeFrog(6)",
            "ranking": 622
        },
        {
            "id": 2074,
            "rarity": 117,
            "type": "greenTreeFrog",
            "ranking": 623
        },
        {
            "id": 2086,
            "rarity": 117,
            "type": "goldenDartFrog",
            "ranking": 624
        },
        {
            "id": 2093,
            "rarity": 117,
            "type": "purpleTreeFrog",
            "ranking": 625
        },
        {
            "id": 2439,
            "rarity": 117,
            "type": "pinkTreeFrog",
            "ranking": 626
        },
        {
            "id": 2501,
            "rarity": 117,
            "type": "unknown",
            "ranking": 627
        },
        {
            "id": 2512,
            "rarity": 117,
            "type": "grayTreeFrog",
            "ranking": 628
        },
        {
            "id": 2561,
            "rarity": 117,
            "type": "goldenDartFrog",
            "ranking": 629
        },
        {
            "id": 2628,
            "rarity": 117,
            "type": "redEyedTreeFrog",
            "ranking": 630
        },
        {
            "id": 2749,
            "rarity": 117,
            "type": "greenTreeFrog",
            "ranking": 631
        },
        {
            "id": 2778,
            "rarity": 117,
            "type": "stawberryDartFrog",
            "ranking": 632
        },
        {
            "id": 2860,
            "rarity": 117,
            "type": "blueTreeFrog",
            "ranking": 633
        },
        {
            "id": 2911,
            "rarity": 117,
            "type": "redEyedTreeFrog",
            "ranking": 634
        },
        {
            "id": 2934,
            "rarity": 117,
            "type": "treeFrog(7)",
            "ranking": 635
        },
        {
            "id": 3004,
            "rarity": 117,
            "type": "brownTreeFrog",
            "ranking": 636
        },
        {
            "id": 3007,
            "rarity": 117,
            "type": "grayTreeFrog",
            "ranking": 637
        },
        {
            "id": 3070,
            "rarity": 117,
            "type": "stawberryDartFrog",
            "ranking": 638
        },
        {
            "id": 3109,
            "rarity": 117,
            "type": "grayTreeFrog",
            "ranking": 639
        },
        {
            "id": 3135,
            "rarity": 117,
            "type": "blueTreeFrog",
            "ranking": 640
        },
        {
            "id": 3136,
            "rarity": 117,
            "type": "lightBrownTreeFrog",
            "ranking": 641
        },
        {
            "id": 3177,
            "rarity": 117,
            "type": "greenTreeFrog",
            "ranking": 642
        },
        {
            "id": 3199,
            "rarity": 117,
            "type": "greenTreeFrog",
            "ranking": 643
        },
        {
            "id": 3324,
            "rarity": 117,
            "type": "purpleTreeFrog",
            "ranking": 644
        },
        {
            "id": 3359,
            "rarity": 117,
            "type": "stawberryDartFrog",
            "ranking": 645
        },
        {
            "id": 3396,
            "rarity": 117,
            "type": "tomatoFrog",
            "ranking": 646
        },
        {
            "id": 3517,
            "rarity": 117,
            "type": "goldenDartFrog",
            "ranking": 647
        },
        {
            "id": 3558,
            "rarity": 117,
            "type": "greenTreeFrog",
            "ranking": 648
        },
        {
            "id": 3588,
            "rarity": 117,
            "type": "goldenDartFrog",
            "ranking": 649
        },
        {
            "id": 3645,
            "rarity": 117,
            "type": "tomatoFrog",
            "ranking": 650
        },
        {
            "id": 3667,
            "rarity": 117,
            "type": "blueTreeFrog",
            "ranking": 651
        },
        {
            "id": 3867,
            "rarity": 117,
            "type": "tomatoFrog",
            "ranking": 652
        },
        {
            "id": 3931,
            "rarity": 117,
            "type": "tomatoFrog",
            "ranking": 653
        },
        {
            "id": 3956,
            "rarity": 117,
            "type": "blueTreeFrog",
            "ranking": 654
        },
        {
            "id": 57,
            "rarity": 116,
            "type": "greenTreeFrog",
            "ranking": 655
        },
        {
            "id": 97,
            "rarity": 116,
            "type": "blueTreeFrog",
            "ranking": 656
        },
        {
            "id": 98,
            "rarity": 116,
            "type": "redEyedTreeFrog",
            "ranking": 657
        },
        {
            "id": 141,
            "rarity": 116,
            "type": "greenTreeFrog",
            "ranking": 658
        },
        {
            "id": 150,
            "rarity": 116,
            "type": "redEyedTreeFrog",
            "ranking": 659
        },
        {
            "id": 268,
            "rarity": 116,
            "type": "redEyedTreeFrog",
            "ranking": 660
        },
        {
            "id": 588,
            "rarity": 116,
            "type": "tomatoFrog",
            "ranking": 661
        },
        {
            "id": 690,
            "rarity": 116,
            "type": "blueDartFrog",
            "ranking": 662
        },
        {
            "id": 797,
            "rarity": 116,
            "type": "blueTreeFrog",
            "ranking": 663
        },
        {
            "id": 810,
            "rarity": 116,
            "type": "tomatoFrog",
            "ranking": 664
        },
        {
            "id": 829,
            "rarity": 116,
            "type": "blueTreeFrog",
            "ranking": 665
        },
        {
            "id": 840,
            "rarity": 116,
            "type": "unknown",
            "ranking": 666
        },
        {
            "id": 866,
            "rarity": 116,
            "type": "redEyedTreeFrog",
            "ranking": 667
        },
        {
            "id": 898,
            "rarity": 116,
            "type": "croaking",
            "ranking": 668
        },
        {
            "id": 954,
            "rarity": 116,
            "type": "lightBrownTreeFrog",
            "ranking": 669
        },
        {
            "id": 1138,
            "rarity": 116,
            "type": "pinkTreeFrog",
            "ranking": 670
        },
        {
            "id": 1242,
            "rarity": 116,
            "type": "stawberryDartFrog",
            "ranking": 671
        },
        {
            "id": 1332,
            "rarity": 116,
            "type": "purpleTreeFrog",
            "ranking": 672
        },
        {
            "id": 1511,
            "rarity": 116,
            "type": "goldenDartFrog",
            "ranking": 673
        },
        {
            "id": 1555,
            "rarity": 116,
            "type": "inversedEyes",
            "ranking": 674
        },
        {
            "id": 1590,
            "rarity": 116,
            "type": "grayTreeFrog",
            "ranking": 675
        },
        {
            "id": 1655,
            "rarity": 116,
            "type": "blueDartFrog",
            "ranking": 676
        },
        {
            "id": 1669,
            "rarity": 116,
            "type": "blueTreeFrog",
            "ranking": 677
        },
        {
            "id": 1707,
            "rarity": 116,
            "type": "goldenDartFrog",
            "ranking": 678
        },
        {
            "id": 1716,
            "rarity": 116,
            "type": "blueTreeFrog",
            "ranking": 679
        },
        {
            "id": 1884,
            "rarity": 116,
            "type": "blueDartFrog",
            "ranking": 680
        },
        {
            "id": 1991,
            "rarity": 116,
            "type": "cyanTreeFrog",
            "ranking": 681
        },
        {
            "id": 2060,
            "rarity": 116,
            "type": "treeFrog(5)",
            "ranking": 682
        },
        {
            "id": 2117,
            "rarity": 116,
            "type": "redEyedTreeFrog",
            "ranking": 683
        },
        {
            "id": 2143,
            "rarity": 116,
            "type": "pinkTreeFrog",
            "ranking": 684
        },
        {
            "id": 2152,
            "rarity": 116,
            "type": "unknown",
            "ranking": 685
        },
        {
            "id": 2249,
            "rarity": 116,
            "type": "redEyedTreeFrog",
            "ranking": 686
        },
        {
            "id": 2278,
            "rarity": 116,
            "type": "goldenDartFrog",
            "ranking": 687
        },
        {
            "id": 2334,
            "rarity": 116,
            "type": "grayTreeFrog",
            "ranking": 688
        },
        {
            "id": 2338,
            "rarity": 116,
            "type": "redEyedTreeFrog",
            "ranking": 689
        },
        {
            "id": 2350,
            "rarity": 116,
            "type": "blueDartFrog",
            "ranking": 690
        },
        {
            "id": 2353,
            "rarity": 116,
            "type": "blueDartFrog",
            "ranking": 691
        },
        {
            "id": 2403,
            "rarity": 116,
            "type": "tomatoFrog",
            "ranking": 692
        },
        {
            "id": 2416,
            "rarity": 116,
            "type": "cyanTreeFrog",
            "ranking": 693
        },
        {
            "id": 2555,
            "rarity": 116,
            "type": "purpleTreeFrog",
            "ranking": 694
        },
        {
            "id": 2567,
            "rarity": 116,
            "type": "redEyedTreeFrog",
            "ranking": 695
        },
        {
            "id": 2577,
            "rarity": 116,
            "type": "blueTreeFrog",
            "ranking": 696
        },
        {
            "id": 2694,
            "rarity": 116,
            "type": "closedEyes",
            "ranking": 697
        },
        {
            "id": 2767,
            "rarity": 116,
            "type": "orangeTreeFrog",
            "ranking": 698
        },
        {
            "id": 2836,
            "rarity": 116,
            "type": "tomatoFrog",
            "ranking": 699
        },
        {
            "id": 2907,
            "rarity": 116,
            "type": "unknown",
            "ranking": 700
        },
        {
            "id": 2973,
            "rarity": 116,
            "type": "tomatoFrog",
            "ranking": 701
        },
        {
            "id": 2977,
            "rarity": 116,
            "type": "redEyedTreeFrog",
            "ranking": 702
        },
        {
            "id": 2987,
            "rarity": 116,
            "type": "brownTreeFrog",
            "ranking": 703
        },
        {
            "id": 3065,
            "rarity": 116,
            "type": "tomatoFrog",
            "ranking": 704
        },
        {
            "id": 3113,
            "rarity": 116,
            "type": "cyanTreeFrog",
            "ranking": 705
        },
        {
            "id": 3236,
            "rarity": 116,
            "type": "greenTreeFrog",
            "ranking": 706
        },
        {
            "id": 3332,
            "rarity": 116,
            "type": "cyanTreeFrog",
            "ranking": 707
        },
        {
            "id": 3438,
            "rarity": 116,
            "type": "tomatoFrog",
            "ranking": 708
        },
        {
            "id": 3618,
            "rarity": 116,
            "type": "grayTreeFrog",
            "ranking": 709
        },
        {
            "id": 3687,
            "rarity": 116,
            "type": "greenTreeFrog",
            "ranking": 710
        },
        {
            "id": 3690,
            "rarity": 116,
            "type": "grayTreeFrog",
            "ranking": 711
        },
        {
            "id": 3891,
            "rarity": 116,
            "type": "grayTreeFrog",
            "ranking": 712
        },
        {
            "id": 3968,
            "rarity": 116,
            "type": "tomatoFrog",
            "ranking": 713
        },
        {
            "id": 3978,
            "rarity": 116,
            "type": "tomatoFrog",
            "ranking": 714
        },
        {
            "id": 104,
            "rarity": 115,
            "type": "greenTreeFrog",
            "ranking": 715
        },
        {
            "id": 209,
            "rarity": 115,
            "type": "goldenDartFrog",
            "ranking": 716
        },
        {
            "id": 271,
            "rarity": 115,
            "type": "greenTreeFrog",
            "ranking": 717
        },
        {
            "id": 429,
            "rarity": 115,
            "type": "greenTreeFrog",
            "ranking": 718
        },
        {
            "id": 469,
            "rarity": 115,
            "type": "cyanTreeFrog",
            "ranking": 719
        },
        {
            "id": 482,
            "rarity": 115,
            "type": "unknown",
            "ranking": 720
        },
        {
            "id": 501,
            "rarity": 115,
            "type": "goldenDartFrog",
            "ranking": 721
        },
        {
            "id": 570,
            "rarity": 115,
            "type": "greenTreeFrog",
            "ranking": 722
        },
        {
            "id": 605,
            "rarity": 115,
            "type": "lightBrownTreeFrog",
            "ranking": 723
        },
        {
            "id": 677,
            "rarity": 115,
            "type": "goldenDartFrog",
            "ranking": 724
        },
        {
            "id": 754,
            "rarity": 115,
            "type": "pinkTreeFrog",
            "ranking": 725
        },
        {
            "id": 831,
            "rarity": 115,
            "type": "blueTreeFrog",
            "ranking": 726
        },
        {
            "id": 909,
            "rarity": 115,
            "type": "unknown",
            "ranking": 727
        },
        {
            "id": 979,
            "rarity": 115,
            "type": "tomatoFrog",
            "ranking": 728
        },
        {
            "id": 1024,
            "rarity": 115,
            "type": "grayTreeFrog",
            "ranking": 729
        },
        {
            "id": 1098,
            "rarity": 115,
            "type": "redEyedTreeFrog",
            "ranking": 730
        },
        {
            "id": 1164,
            "rarity": 115,
            "type": "unknown",
            "ranking": 731
        },
        {
            "id": 1168,
            "rarity": 115,
            "type": "brownTreeFrog",
            "ranking": 732
        },
        {
            "id": 1172,
            "rarity": 115,
            "type": "unknown",
            "ranking": 733
        },
        {
            "id": 1307,
            "rarity": 115,
            "type": "lightBrownTreeFrog",
            "ranking": 734
        },
        {
            "id": 1311,
            "rarity": 115,
            "type": "goldenDartFrog",
            "ranking": 735
        },
        {
            "id": 1348,
            "rarity": 115,
            "type": "brownTreeFrog",
            "ranking": 736
        },
        {
            "id": 1363,
            "rarity": 115,
            "type": "greenTreeFrog",
            "ranking": 737
        },
        {
            "id": 1439,
            "rarity": 115,
            "type": "orangeTreeFrog",
            "ranking": 738
        },
        {
            "id": 1583,
            "rarity": 115,
            "type": "lightBrownTreeFrog",
            "ranking": 739
        },
        {
            "id": 1597,
            "rarity": 115,
            "type": "tomatoFrog",
            "ranking": 740
        },
        {
            "id": 1658,
            "rarity": 115,
            "type": "orangeTreeFrog",
            "ranking": 741
        },
        {
            "id": 1771,
            "rarity": 115,
            "type": "blueTreeFrog",
            "ranking": 742
        },
        {
            "id": 1773,
            "rarity": 115,
            "type": "greenTreeFrog",
            "ranking": 743
        },
        {
            "id": 1845,
            "rarity": 115,
            "type": "stawberryDartFrog",
            "ranking": 744
        },
        {
            "id": 1949,
            "rarity": 115,
            "type": "orangeTreeFrog",
            "ranking": 745
        },
        {
            "id": 1972,
            "rarity": 115,
            "type": "unknown",
            "ranking": 746
        },
        {
            "id": 1975,
            "rarity": 115,
            "type": "greenTreeFrog",
            "ranking": 747
        },
        {
            "id": 2046,
            "rarity": 115,
            "type": "redEyedTreeFrog",
            "ranking": 748
        },
        {
            "id": 2131,
            "rarity": 115,
            "type": "cyanTreeFrog",
            "ranking": 749
        },
        {
            "id": 2221,
            "rarity": 115,
            "type": "goldenDartFrog",
            "ranking": 750
        },
        {
            "id": 2488,
            "rarity": 115,
            "type": "tomatoFrog",
            "ranking": 751
        },
        {
            "id": 2651,
            "rarity": 115,
            "type": "blueTreeFrog",
            "ranking": 752
        },
        {
            "id": 2701,
            "rarity": 115,
            "type": "lightBrownTreeFrog",
            "ranking": 753
        },
        {
            "id": 2706,
            "rarity": 115,
            "type": "greenTreeFrog",
            "ranking": 754
        },
        {
            "id": 2727,
            "rarity": 115,
            "type": "lightBrownTreeFrog",
            "ranking": 755
        },
        {
            "id": 2780,
            "rarity": 115,
            "type": "tomatoFrog",
            "ranking": 756
        },
        {
            "id": 2861,
            "rarity": 115,
            "type": "blueDartFrog",
            "ranking": 757
        },
        {
            "id": 2904,
            "rarity": 115,
            "type": "redEyedTreeFrog",
            "ranking": 758
        },
        {
            "id": 2966,
            "rarity": 115,
            "type": "cyanTreeFrog",
            "ranking": 759
        },
        {
            "id": 2972,
            "rarity": 115,
            "type": "tomatoFrog",
            "ranking": 760
        },
        {
            "id": 3102,
            "rarity": 115,
            "type": "goldenDartFrog",
            "ranking": 761
        },
        {
            "id": 3572,
            "rarity": 115,
            "type": "redEyedTreeFrog",
            "ranking": 762
        },
        {
            "id": 3596,
            "rarity": 115,
            "type": "unknown",
            "ranking": 763
        },
        {
            "id": 3627,
            "rarity": 115,
            "type": "goldenDartFrog",
            "ranking": 764
        },
        {
            "id": 3640,
            "rarity": 115,
            "type": "croaking",
            "ranking": 765
        },
        {
            "id": 3769,
            "rarity": 115,
            "type": "lightBrownTreeFrog",
            "ranking": 766
        },
        {
            "id": 3870,
            "rarity": 115,
            "type": "greenTreeFrog",
            "ranking": 767
        },
        {
            "id": 3875,
            "rarity": 115,
            "type": "greenTreeFrog",
            "ranking": 768
        },
        {
            "id": 3976,
            "rarity": 115,
            "type": "blueTreeFrog",
            "ranking": 769
        },
        {
            "id": 75,
            "rarity": 114,
            "type": "blueDartFrog",
            "ranking": 770
        },
        {
            "id": 116,
            "rarity": 114,
            "type": "thirdEye",
            "ranking": 771
        },
        {
            "id": 135,
            "rarity": 114,
            "type": "cyanTreeFrog",
            "ranking": 772
        },
        {
            "id": 240,
            "rarity": 114,
            "type": "cyanTreeFrog",
            "ranking": 773
        },
        {
            "id": 277,
            "rarity": 114,
            "type": "unknown",
            "ranking": 774
        },
        {
            "id": 341,
            "rarity": 114,
            "type": "brownTreeFrog",
            "ranking": 775
        },
        {
            "id": 466,
            "rarity": 114,
            "type": "grayTreeFrog",
            "ranking": 776
        },
        {
            "id": 515,
            "rarity": 114,
            "type": "brownTreeFrog",
            "ranking": 777
        },
        {
            "id": 609,
            "rarity": 114,
            "type": "blueTreeFrog",
            "ranking": 778
        },
        {
            "id": 744,
            "rarity": 114,
            "type": "pinkTreeFrog",
            "ranking": 779
        },
        {
            "id": 768,
            "rarity": 114,
            "type": "treeFrog(8)",
            "ranking": 780
        },
        {
            "id": 851,
            "rarity": 114,
            "type": "goldenDartFrog",
            "ranking": 781
        },
        {
            "id": 888,
            "rarity": 114,
            "type": "orangeTreeFrog",
            "ranking": 782
        },
        {
            "id": 896,
            "rarity": 114,
            "type": "blueTreeFrog",
            "ranking": 783
        },
        {
            "id": 901,
            "rarity": 114,
            "type": "purpleTreeFrog",
            "ranking": 784
        },
        {
            "id": 904,
            "rarity": 114,
            "type": "blueTreeFrog",
            "ranking": 785
        },
        {
            "id": 912,
            "rarity": 114,
            "type": "goldenDartFrog",
            "ranking": 786
        },
        {
            "id": 1072,
            "rarity": 114,
            "type": "cyanTreeFrog",
            "ranking": 787
        },
        {
            "id": 1081,
            "rarity": 114,
            "type": "lightBrownTreeFrog",
            "ranking": 788
        },
        {
            "id": 1121,
            "rarity": 114,
            "type": "brownTreeFrog",
            "ranking": 789
        },
        {
            "id": 1147,
            "rarity": 114,
            "type": "goldenDartFrog",
            "ranking": 790
        },
        {
            "id": 1167,
            "rarity": 114,
            "type": "brownTreeFrog",
            "ranking": 791
        },
        {
            "id": 1223,
            "rarity": 114,
            "type": "goldenDartFrog",
            "ranking": 792
        },
        {
            "id": 1225,
            "rarity": 114,
            "type": "redEyedTreeFrog",
            "ranking": 793
        },
        {
            "id": 1310,
            "rarity": 114,
            "type": "unknown",
            "ranking": 794
        },
        {
            "id": 1326,
            "rarity": 114,
            "type": "cyanTreeFrog",
            "ranking": 795
        },
        {
            "id": 1427,
            "rarity": 114,
            "type": "brownTreeFrog",
            "ranking": 796
        },
        {
            "id": 1432,
            "rarity": 114,
            "type": "brownTreeFrog",
            "ranking": 797
        },
        {
            "id": 1720,
            "rarity": 114,
            "type": "brownTreeFrog",
            "ranking": 798
        },
        {
            "id": 1778,
            "rarity": 114,
            "type": "pinkTreeFrog",
            "ranking": 799
        },
        {
            "id": 1982,
            "rarity": 114,
            "type": "orangeTreeFrog",
            "ranking": 800
        },
        {
            "id": 2010,
            "rarity": 114,
            "type": "brownTreeFrog",
            "ranking": 801
        },
        {
            "id": 2027,
            "rarity": 114,
            "type": "tomatoFrog",
            "ranking": 802
        },
        {
            "id": 2088,
            "rarity": 114,
            "type": "lightBrownTreeFrog",
            "ranking": 803
        },
        {
            "id": 2132,
            "rarity": 114,
            "type": "tomatoFrog",
            "ranking": 804
        },
        {
            "id": 2263,
            "rarity": 114,
            "type": "goldenDartFrog",
            "ranking": 805
        },
        {
            "id": 2277,
            "rarity": 114,
            "type": "redEyedTreeFrog",
            "ranking": 806
        },
        {
            "id": 2378,
            "rarity": 114,
            "type": "goldenDartFrog",
            "ranking": 807
        },
        {
            "id": 2417,
            "rarity": 114,
            "type": "brownTreeFrog",
            "ranking": 808
        },
        {
            "id": 2458,
            "rarity": 114,
            "type": "pinkTreeFrog",
            "ranking": 809
        },
        {
            "id": 2478,
            "rarity": 114,
            "type": "cyanTreeFrog",
            "ranking": 810
        },
        {
            "id": 2562,
            "rarity": 114,
            "type": "unknown",
            "ranking": 811
        },
        {
            "id": 2585,
            "rarity": 114,
            "type": "redEyedTreeFrog",
            "ranking": 812
        },
        {
            "id": 2879,
            "rarity": 114,
            "type": "greenTreeFrog",
            "ranking": 813
        },
        {
            "id": 2921,
            "rarity": 114,
            "type": "grayTreeFrog",
            "ranking": 814
        },
        {
            "id": 3014,
            "rarity": 114,
            "type": "stawberryDartFrog",
            "ranking": 815
        },
        {
            "id": 3046,
            "rarity": 114,
            "type": "greenTreeFrog",
            "ranking": 816
        },
        {
            "id": 3081,
            "rarity": 114,
            "type": "redEyedTreeFrog",
            "ranking": 817
        },
        {
            "id": 3091,
            "rarity": 114,
            "type": "grayTreeFrog",
            "ranking": 818
        },
        {
            "id": 3106,
            "rarity": 114,
            "type": "grayTreeFrog",
            "ranking": 819
        },
        {
            "id": 3163,
            "rarity": 114,
            "type": "unknown",
            "ranking": 820
        },
        {
            "id": 3325,
            "rarity": 114,
            "type": "grayTreeFrog",
            "ranking": 821
        },
        {
            "id": 3452,
            "rarity": 114,
            "type": "purpleTreeFrog",
            "ranking": 822
        },
        {
            "id": 3664,
            "rarity": 114,
            "type": "pinkTreeFrog",
            "ranking": 823
        },
        {
            "id": 3820,
            "rarity": 114,
            "type": "unknown",
            "ranking": 824
        },
        {
            "id": 33,
            "rarity": 113,
            "type": "treeFrog(7)",
            "ranking": 825
        },
        {
            "id": 115,
            "rarity": 113,
            "type": "brownTreeFrog",
            "ranking": 826
        },
        {
            "id": 137,
            "rarity": 113,
            "type": "brownTreeFrog",
            "ranking": 827
        },
        {
            "id": 139,
            "rarity": 113,
            "type": "lightBrownTreeFrog",
            "ranking": 828
        },
        {
            "id": 140,
            "rarity": 113,
            "type": "redEyedTreeFrog",
            "ranking": 829
        },
        {
            "id": 263,
            "rarity": 113,
            "type": "tomatoFrog",
            "ranking": 830
        },
        {
            "id": 283,
            "rarity": 113,
            "type": "treeFrog(7)",
            "ranking": 831
        },
        {
            "id": 317,
            "rarity": 113,
            "type": "brownTreeFrog",
            "ranking": 832
        },
        {
            "id": 474,
            "rarity": 113,
            "type": "lightBrownTreeFrog",
            "ranking": 833
        },
        {
            "id": 499,
            "rarity": 113,
            "type": "croaking",
            "ranking": 834
        },
        {
            "id": 691,
            "rarity": 113,
            "type": "cyanTreeFrog",
            "ranking": 835
        },
        {
            "id": 929,
            "rarity": 113,
            "type": "unknown",
            "ranking": 836
        },
        {
            "id": 934,
            "rarity": 113,
            "type": "cyanTreeFrog",
            "ranking": 837
        },
        {
            "id": 1150,
            "rarity": 113,
            "type": "cyanTreeFrog",
            "ranking": 838
        },
        {
            "id": 1166,
            "rarity": 113,
            "type": "blueTreeFrog",
            "ranking": 839
        },
        {
            "id": 1421,
            "rarity": 113,
            "type": "greenTreeFrog",
            "ranking": 840
        },
        {
            "id": 1677,
            "rarity": 113,
            "type": "goldenDartFrog",
            "ranking": 841
        },
        {
            "id": 1730,
            "rarity": 113,
            "type": "lightBrownTreeFrog",
            "ranking": 842
        },
        {
            "id": 1785,
            "rarity": 113,
            "type": "blueDartFrog",
            "ranking": 843
        },
        {
            "id": 1798,
            "rarity": 113,
            "type": "stawberryDartFrog",
            "ranking": 844
        },
        {
            "id": 1829,
            "rarity": 113,
            "type": "brownTreeFrog",
            "ranking": 845
        },
        {
            "id": 2006,
            "rarity": 113,
            "type": "cyanTreeFrog",
            "ranking": 846
        },
        {
            "id": 2014,
            "rarity": 113,
            "type": "unknown",
            "ranking": 847
        },
        {
            "id": 2090,
            "rarity": 113,
            "type": "cyanTreeFrog",
            "ranking": 848
        },
        {
            "id": 2187,
            "rarity": 113,
            "type": "cyanTreeFrog",
            "ranking": 849
        },
        {
            "id": 2252,
            "rarity": 113,
            "type": "orangeTreeFrog",
            "ranking": 850
        },
        {
            "id": 2269,
            "rarity": 113,
            "type": "brownTreeFrog",
            "ranking": 851
        },
        {
            "id": 2374,
            "rarity": 113,
            "type": "brownTreeFrog",
            "ranking": 852
        },
        {
            "id": 2377,
            "rarity": 113,
            "type": "brownTreeFrog",
            "ranking": 853
        },
        {
            "id": 2381,
            "rarity": 113,
            "type": "greenTreeFrog",
            "ranking": 854
        },
        {
            "id": 2558,
            "rarity": 113,
            "type": "unknown",
            "ranking": 855
        },
        {
            "id": 2633,
            "rarity": 113,
            "type": "redEyedTreeFrog",
            "ranking": 856
        },
        {
            "id": 2740,
            "rarity": 113,
            "type": "blueTreeFrog",
            "ranking": 857
        },
        {
            "id": 2997,
            "rarity": 113,
            "type": "stawberryDartFrog",
            "ranking": 858
        },
        {
            "id": 3110,
            "rarity": 113,
            "type": "tomatoFrog",
            "ranking": 859
        },
        {
            "id": 3380,
            "rarity": 113,
            "type": "brownTreeFrog",
            "ranking": 860
        },
        {
            "id": 3466,
            "rarity": 113,
            "type": "redEyedTreeFrog",
            "ranking": 861
        },
        {
            "id": 3563,
            "rarity": 113,
            "type": "greenTreeFrog",
            "ranking": 862
        },
        {
            "id": 3610,
            "rarity": 113,
            "type": "brownTreeFrog",
            "ranking": 863
        },
        {
            "id": 3635,
            "rarity": 113,
            "type": "goldenDartFrog",
            "ranking": 864
        },
        {
            "id": 3788,
            "rarity": 113,
            "type": "tomatoFrog",
            "ranking": 865
        },
        {
            "id": 3831,
            "rarity": 113,
            "type": "cyanTreeFrog",
            "ranking": 866
        },
        {
            "id": 3900,
            "rarity": 113,
            "type": "tomatoFrog",
            "ranking": 867
        },
        {
            "id": 3980,
            "rarity": 113,
            "type": "greenTreeFrog",
            "ranking": 868
        },
        {
            "id": 72,
            "rarity": 112,
            "type": "cyanTreeFrog",
            "ranking": 869
        },
        {
            "id": 74,
            "rarity": 112,
            "type": "redEyedTreeFrog",
            "ranking": 870
        },
        {
            "id": 142,
            "rarity": 112,
            "type": "brownTreeFrog",
            "ranking": 871
        },
        {
            "id": 224,
            "rarity": 112,
            "type": "lightBrownTreeFrog",
            "ranking": 872
        },
        {
            "id": 412,
            "rarity": 112,
            "type": "lightBrownTreeFrog",
            "ranking": 873
        },
        {
            "id": 563,
            "rarity": 112,
            "type": "lightBrownTreeFrog",
            "ranking": 874
        },
        {
            "id": 572,
            "rarity": 112,
            "type": "treeFrog(6)",
            "ranking": 875
        },
        {
            "id": 593,
            "rarity": 112,
            "type": "greenTreeFrog",
            "ranking": 876
        },
        {
            "id": 678,
            "rarity": 112,
            "type": "closedEyes",
            "ranking": 877
        },
        {
            "id": 701,
            "rarity": 112,
            "type": "unknown",
            "ranking": 878
        },
        {
            "id": 762,
            "rarity": 112,
            "type": "cyanTreeFrog",
            "ranking": 879
        },
        {
            "id": 815,
            "rarity": 112,
            "type": "lightBrownTreeFrog",
            "ranking": 880
        },
        {
            "id": 999,
            "rarity": 112,
            "type": "redEyedTreeFrog",
            "ranking": 881
        },
        {
            "id": 1041,
            "rarity": 112,
            "type": "brownTreeFrog",
            "ranking": 882
        },
        {
            "id": 1085,
            "rarity": 112,
            "type": "lightBrownTreeFrog",
            "ranking": 883
        },
        {
            "id": 1100,
            "rarity": 112,
            "type": "cyanTreeFrog",
            "ranking": 884
        },
        {
            "id": 1235,
            "rarity": 112,
            "type": "goldenDartFrog",
            "ranking": 885
        },
        {
            "id": 1271,
            "rarity": 112,
            "type": "cyanTreeFrog",
            "ranking": 886
        },
        {
            "id": 1493,
            "rarity": 112,
            "type": "unknown",
            "ranking": 887
        },
        {
            "id": 1587,
            "rarity": 112,
            "type": "tomatoFrog",
            "ranking": 888
        },
        {
            "id": 1623,
            "rarity": 112,
            "type": "greenTreeFrog",
            "ranking": 889
        },
        {
            "id": 1807,
            "rarity": 112,
            "type": "lightBrownTreeFrog",
            "ranking": 890
        },
        {
            "id": 1828,
            "rarity": 112,
            "type": "blueDartFrog",
            "ranking": 891
        },
        {
            "id": 1837,
            "rarity": 112,
            "type": "grayTreeFrog",
            "ranking": 892
        },
        {
            "id": 1953,
            "rarity": 112,
            "type": "goldenDartFrog",
            "ranking": 893
        },
        {
            "id": 2056,
            "rarity": 112,
            "type": "greenTreeFrog",
            "ranking": 894
        },
        {
            "id": 2156,
            "rarity": 112,
            "type": "redEyedTreeFrog",
            "ranking": 895
        },
        {
            "id": 2365,
            "rarity": 112,
            "type": "brownTreeFrog",
            "ranking": 896
        },
        {
            "id": 2910,
            "rarity": 112,
            "type": "closedEyes",
            "ranking": 897
        },
        {
            "id": 2978,
            "rarity": 112,
            "type": "cyanTreeFrog",
            "ranking": 898
        },
        {
            "id": 3005,
            "rarity": 112,
            "type": "brownTreeFrog",
            "ranking": 899
        },
        {
            "id": 3078,
            "rarity": 112,
            "type": "tomatoFrog",
            "ranking": 900
        },
        {
            "id": 3208,
            "rarity": 112,
            "type": "pinkTreeFrog",
            "ranking": 901
        },
        {
            "id": 3487,
            "rarity": 112,
            "type": "goldenTreeFrog",
            "ranking": 902
        },
        {
            "id": 3622,
            "rarity": 112,
            "type": "brownTreeFrog",
            "ranking": 903
        },
        {
            "id": 3671,
            "rarity": 112,
            "type": "redEyedTreeFrog",
            "ranking": 904
        },
        {
            "id": 3685,
            "rarity": 112,
            "type": "unknown",
            "ranking": 905
        },
        {
            "id": 3743,
            "rarity": 112,
            "type": "cyanTreeFrog",
            "ranking": 906
        },
        {
            "id": 3950,
            "rarity": 112,
            "type": "tomatoFrog",
            "ranking": 907
        },
        {
            "id": 3989,
            "rarity": 112,
            "type": "treeFrog(6)",
            "ranking": 908
        },
        {
            "id": 136,
            "rarity": 111,
            "type": "tomatoFrog",
            "ranking": 909
        },
        {
            "id": 257,
            "rarity": 111,
            "type": "unknown",
            "ranking": 910
        },
        {
            "id": 359,
            "rarity": 111,
            "type": "unknown",
            "ranking": 911
        },
        {
            "id": 373,
            "rarity": 111,
            "type": "brownTreeFrog",
            "ranking": 912
        },
        {
            "id": 396,
            "rarity": 111,
            "type": "tomatoFrog",
            "ranking": 913
        },
        {
            "id": 440,
            "rarity": 111,
            "type": "greenTreeFrog",
            "ranking": 914
        },
        {
            "id": 603,
            "rarity": 111,
            "type": "lightBrownTreeFrog",
            "ranking": 915
        },
        {
            "id": 633,
            "rarity": 111,
            "type": "goldenDartFrog",
            "ranking": 916
        },
        {
            "id": 669,
            "rarity": 111,
            "type": "lightBrownTreeFrog",
            "ranking": 917
        },
        {
            "id": 824,
            "rarity": 111,
            "type": "goldenDartFrog",
            "ranking": 918
        },
        {
            "id": 949,
            "rarity": 111,
            "type": "redEyedTreeFrog",
            "ranking": 919
        },
        {
            "id": 1090,
            "rarity": 111,
            "type": "greenTreeFrog",
            "ranking": 920
        },
        {
            "id": 1261,
            "rarity": 111,
            "type": "cyanTreeFrog",
            "ranking": 921
        },
        {
            "id": 1461,
            "rarity": 111,
            "type": "blueDartFrog",
            "ranking": 922
        },
        {
            "id": 1616,
            "rarity": 111,
            "type": "brownTreeFrog",
            "ranking": 923
        },
        {
            "id": 1797,
            "rarity": 111,
            "type": "greenTreeFrog",
            "ranking": 924
        },
        {
            "id": 1891,
            "rarity": 111,
            "type": "lightBrownTreeFrog",
            "ranking": 925
        },
        {
            "id": 2125,
            "rarity": 111,
            "type": "grayTreeFrog",
            "ranking": 926
        },
        {
            "id": 2243,
            "rarity": 111,
            "type": "cyanTreeFrog",
            "ranking": 927
        },
        {
            "id": 2260,
            "rarity": 111,
            "type": "blueTreeFrog",
            "ranking": 928
        },
        {
            "id": 2342,
            "rarity": 111,
            "type": "cyanTreeFrog",
            "ranking": 929
        },
        {
            "id": 2404,
            "rarity": 111,
            "type": "lightBrownTreeFrog",
            "ranking": 930
        },
        {
            "id": 2408,
            "rarity": 111,
            "type": "brownTreeFrog",
            "ranking": 931
        },
        {
            "id": 2447,
            "rarity": 111,
            "type": "grayTreeFrog",
            "ranking": 932
        },
        {
            "id": 2477,
            "rarity": 111,
            "type": "blueTreeFrog",
            "ranking": 933
        },
        {
            "id": 2506,
            "rarity": 111,
            "type": "cyanTreeFrog",
            "ranking": 934
        },
        {
            "id": 2768,
            "rarity": 111,
            "type": "tomatoFrog",
            "ranking": 935
        },
        {
            "id": 2925,
            "rarity": 111,
            "type": "brownTreeFrog",
            "ranking": 936
        },
        {
            "id": 2932,
            "rarity": 111,
            "type": "closedEyes",
            "ranking": 937
        },
        {
            "id": 3203,
            "rarity": 111,
            "type": "brownTreeFrog",
            "ranking": 938
        },
        {
            "id": 3322,
            "rarity": 111,
            "type": "brownTreeFrog",
            "ranking": 939
        },
        {
            "id": 3362,
            "rarity": 111,
            "type": "brownTreeFrog",
            "ranking": 940
        },
        {
            "id": 37,
            "rarity": 110,
            "type": "blueTreeFrog",
            "ranking": 941
        },
        {
            "id": 179,
            "rarity": 110,
            "type": "redEyedTreeFrog",
            "ranking": 942
        },
        {
            "id": 229,
            "rarity": 110,
            "type": "greenTreeFrog",
            "ranking": 943
        },
        {
            "id": 273,
            "rarity": 110,
            "type": "treeFrog(3)",
            "ranking": 944
        },
        {
            "id": 602,
            "rarity": 110,
            "type": "cyanTreeFrog",
            "ranking": 945
        },
        {
            "id": 626,
            "rarity": 110,
            "type": "tomatoFrog",
            "ranking": 946
        },
        {
            "id": 771,
            "rarity": 110,
            "type": "cyanTreeFrog",
            "ranking": 947
        },
        {
            "id": 850,
            "rarity": 110,
            "type": "grayTreeFrog",
            "ranking": 948
        },
        {
            "id": 862,
            "rarity": 110,
            "type": "lightBrownTreeFrog",
            "ranking": 949
        },
        {
            "id": 981,
            "rarity": 110,
            "type": "lightBrownTreeFrog",
            "ranking": 950
        },
        {
            "id": 1185,
            "rarity": 110,
            "type": "unknown",
            "ranking": 951
        },
        {
            "id": 1309,
            "rarity": 110,
            "type": "cyanTreeFrog",
            "ranking": 952
        },
        {
            "id": 1468,
            "rarity": 110,
            "type": "brownTreeFrog",
            "ranking": 953
        },
        {
            "id": 1492,
            "rarity": 110,
            "type": "unknown",
            "ranking": 954
        },
        {
            "id": 1631,
            "rarity": 110,
            "type": "lightBrownTreeFrog",
            "ranking": 955
        },
        {
            "id": 1961,
            "rarity": 110,
            "type": "treeFrog(2)",
            "ranking": 956
        },
        {
            "id": 1977,
            "rarity": 110,
            "type": "cyanTreeFrog",
            "ranking": 957
        },
        {
            "id": 2213,
            "rarity": 110,
            "type": "goldenTreeFrog",
            "ranking": 958
        },
        {
            "id": 2436,
            "rarity": 110,
            "type": "goldenTreeFrog",
            "ranking": 959
        },
        {
            "id": 2464,
            "rarity": 110,
            "type": "redEyedTreeFrog",
            "ranking": 960
        },
        {
            "id": 2474,
            "rarity": 110,
            "type": "greenTreeFrog",
            "ranking": 961
        },
        {
            "id": 2505,
            "rarity": 110,
            "type": "cyanTreeFrog",
            "ranking": 962
        },
        {
            "id": 2509,
            "rarity": 110,
            "type": "brownTreeFrog",
            "ranking": 963
        },
        {
            "id": 2608,
            "rarity": 110,
            "type": "greenTreeFrog",
            "ranking": 964
        },
        {
            "id": 2766,
            "rarity": 110,
            "type": "cyanTreeFrog",
            "ranking": 965
        },
        {
            "id": 3042,
            "rarity": 110,
            "type": "lightBrownTreeFrog",
            "ranking": 966
        },
        {
            "id": 3315,
            "rarity": 110,
            "type": "unknown",
            "ranking": 967
        },
        {
            "id": 3626,
            "rarity": 110,
            "type": "closedEyes",
            "ranking": 968
        },
        {
            "id": 148,
            "rarity": 109,
            "type": "redEyedTreeFrog",
            "ranking": 969
        },
        {
            "id": 243,
            "rarity": 109,
            "type": "croaking",
            "ranking": 970
        },
        {
            "id": 486,
            "rarity": 109,
            "type": "brownTreeFrog",
            "ranking": 971
        },
        {
            "id": 505,
            "rarity": 109,
            "type": "lightBrownTreeFrog",
            "ranking": 972
        },
        {
            "id": 948,
            "rarity": 109,
            "type": "lightBrownTreeFrog",
            "ranking": 973
        },
        {
            "id": 1105,
            "rarity": 109,
            "type": "croaking",
            "ranking": 974
        },
        {
            "id": 1400,
            "rarity": 109,
            "type": "lightBrownTreeFrog",
            "ranking": 975
        },
        {
            "id": 1509,
            "rarity": 109,
            "type": "treeFrog(2)",
            "ranking": 976
        },
        {
            "id": 1547,
            "rarity": 109,
            "type": "cyanTreeFrog",
            "ranking": 977
        },
        {
            "id": 1636,
            "rarity": 109,
            "type": "treeFrog(8)",
            "ranking": 978
        },
        {
            "id": 2182,
            "rarity": 109,
            "type": "goldenTreeFrog",
            "ranking": 979
        },
        {
            "id": 2618,
            "rarity": 109,
            "type": "grayTreeFrog",
            "ranking": 980
        },
        {
            "id": 2812,
            "rarity": 109,
            "type": "brownTreeFrog",
            "ranking": 981
        },
        {
            "id": 3105,
            "rarity": 109,
            "type": "treeFrog(8)",
            "ranking": 982
        },
        {
            "id": 3173,
            "rarity": 109,
            "type": "redEyedTreeFrog",
            "ranking": 983
        },
        {
            "id": 3570,
            "rarity": 109,
            "type": "treeFrog(5)",
            "ranking": 984
        },
        {
            "id": 3763,
            "rarity": 109,
            "type": "treeFrog(5)",
            "ranking": 985
        },
        {
            "id": 3768,
            "rarity": 109,
            "type": "splendidLeafFrog",
            "ranking": 986
        },
        {
            "id": 3884,
            "rarity": 109,
            "type": "treeFrog(2)",
            "ranking": 987
        },
        {
            "id": 3945,
            "rarity": 109,
            "type": "goldenTreeFrog",
            "ranking": 988
        },
        {
            "id": 3951,
            "rarity": 109,
            "type": "blueTreeFrog",
            "ranking": 989
        },
        {
            "id": 1,
            "rarity": 108,
            "type": "cyanTreeFrog",
            "ranking": 990
        },
        {
            "id": 292,
            "rarity": 108,
            "type": "splendidLeafFrog",
            "ranking": 991
        },
        {
            "id": 1146,
            "rarity": 108,
            "type": "lightBrownTreeFrog",
            "ranking": 992
        },
        {
            "id": 1392,
            "rarity": 108,
            "type": "splendidLeafFrog",
            "ranking": 993
        },
        {
            "id": 1648,
            "rarity": 108,
            "type": "brownTreeFrog",
            "ranking": 994
        },
        {
            "id": 1781,
            "rarity": 108,
            "type": "cyanTreeFrog",
            "ranking": 995
        },
        {
            "id": 1934,
            "rarity": 108,
            "type": "treeFrog(2)",
            "ranking": 996
        },
        {
            "id": 2208,
            "rarity": 108,
            "type": "treeFrog(8)",
            "ranking": 997
        },
        {
            "id": 2311,
            "rarity": 108,
            "type": "lightBrownTreeFrog",
            "ranking": 998
        },
        {
            "id": 2553,
            "rarity": 108,
            "type": "croaking",
            "ranking": 999
        },
        {
            "id": 2624,
            "rarity": 108,
            "type": "lightBrownTreeFrog",
            "ranking": 1000
        },
        {
            "id": 2751,
            "rarity": 108,
            "type": "redEyedTreeFrog",
            "ranking": 1001
        },
        {
            "id": 3395,
            "rarity": 108,
            "type": "brownTreeFrog",
            "ranking": 1002
        },
        {
            "id": 3482,
            "rarity": 108,
            "type": "goldenTreeFrog",
            "ranking": 1003
        },
        {
            "id": 3526,
            "rarity": 108,
            "type": "lightBrownTreeFrog",
            "ranking": 1004
        },
        {
            "id": 84,
            "rarity": 107,
            "type": "goldenTreeFrog",
            "ranking": 1005
        },
        {
            "id": 1232,
            "rarity": 107,
            "type": "lightBrownTreeFrog",
            "ranking": 1006
        },
        {
            "id": 1476,
            "rarity": 107,
            "type": "treeFrog(8)",
            "ranking": 1007
        },
        {
            "id": 2015,
            "rarity": 107,
            "type": "treeFrog(8)",
            "ranking": 1008
        },
        {
            "id": 2247,
            "rarity": 107,
            "type": "goldenTreeFrog",
            "ranking": 1009
        },
        {
            "id": 2299,
            "rarity": 107,
            "type": "brownTreeFrog",
            "ranking": 1010
        },
        {
            "id": 2310,
            "rarity": 107,
            "type": "cyanTreeFrog",
            "ranking": 1011
        },
        {
            "id": 2392,
            "rarity": 107,
            "type": "croaking",
            "ranking": 1012
        },
        {
            "id": 2941,
            "rarity": 107,
            "type": "lightBrownTreeFrog",
            "ranking": 1013
        },
        {
            "id": 3312,
            "rarity": 107,
            "type": "lightBrownTreeFrog",
            "ranking": 1014
        },
        {
            "id": 3642,
            "rarity": 107,
            "type": "treeFrog(6)",
            "ranking": 1015
        },
        {
            "id": 3818,
            "rarity": 107,
            "type": "treeFrog(1)",
            "ranking": 1016
        },
        {
            "id": 665,
            "rarity": 106,
            "type": "treeFrog(2)",
            "ranking": 1017
        },
        {
            "id": 770,
            "rarity": 106,
            "type": "treeFrog(2)",
            "ranking": 1018
        },
        {
            "id": 1280,
            "rarity": 106,
            "type": "brownTreeFrog",
            "ranking": 1019
        },
        {
            "id": 1457,
            "rarity": 106,
            "type": "goldenTreeFrog",
            "ranking": 1020
        },
        {
            "id": 1661,
            "rarity": 106,
            "type": "lightBrownTreeFrog",
            "ranking": 1021
        },
        {
            "id": 1976,
            "rarity": 106,
            "type": "cyanTreeFrog",
            "ranking": 1022
        },
        {
            "id": 2673,
            "rarity": 106,
            "type": "treeFrog(2)",
            "ranking": 1023
        },
        {
            "id": 3310,
            "rarity": 106,
            "type": "lightBrownTreeFrog",
            "ranking": 1024
        },
        {
            "id": 3979,
            "rarity": 106,
            "type": "cyanTreeFrog",
            "ranking": 1025
        },
        {
            "id": 1142,
            "rarity": 105,
            "type": "closedEyes",
            "ranking": 1026
        },
        {
            "id": 1588,
            "rarity": 105,
            "type": "splendidLeafFrog",
            "ranking": 1027
        },
        {
            "id": 1599,
            "rarity": 105,
            "type": "treeFrog(7)",
            "ranking": 1028
        },
        {
            "id": 1685,
            "rarity": 105,
            "type": "cyanTreeFrog",
            "ranking": 1029
        },
        {
            "id": 2560,
            "rarity": 105,
            "type": "treeFrog(6)",
            "ranking": 1030
        },
        {
            "id": 3617,
            "rarity": 105,
            "type": "treeFrog(3)",
            "ranking": 1031
        },
        {
            "id": 152,
            "rarity": 104,
            "type": "lightBrownTreeFrog",
            "ranking": 1032
        },
        {
            "id": 306,
            "rarity": 104,
            "type": "treeFrog(5)",
            "ranking": 1033
        },
        {
            "id": 794,
            "rarity": 104,
            "type": "lightBrownTreeFrog",
            "ranking": 1034
        },
        {
            "id": 2340,
            "rarity": 104,
            "type": "treeFrog(1)",
            "ranking": 1035
        },
        {
            "id": 2516,
            "rarity": 104,
            "type": "brownTreeFrog",
            "ranking": 1036
        },
        {
            "id": 3099,
            "rarity": 104,
            "type": "brownTreeFrog",
            "ranking": 1037
        },
        {
            "id": 3646,
            "rarity": 104,
            "type": "treeFrog(2)",
            "ranking": 1038
        },
        {
            "id": 3771,
            "rarity": 104,
            "type": "treeFrog(7)",
            "ranking": 1039
        },
        {
            "id": 4013,
            "rarity": 104,
            "type": "treeFrog(3)",
            "ranking": 1040
        },
        {
            "id": 24,
            "rarity": 103,
            "type": "treeFrog(3)",
            "ranking": 1041
        },
        {
            "id": 304,
            "rarity": 103,
            "type": "treeFrog(8)",
            "ranking": 1042
        },
        {
            "id": 455,
            "rarity": 103,
            "type": "treeFrog(1)",
            "ranking": 1043
        },
        {
            "id": 854,
            "rarity": 103,
            "type": "treeFrog(2)",
            "ranking": 1044
        },
        {
            "id": 1264,
            "rarity": 103,
            "type": "treeFrog(1)",
            "ranking": 1045
        },
        {
            "id": 1369,
            "rarity": 103,
            "type": "treeFrog(2)",
            "ranking": 1046
        },
        {
            "id": 2619,
            "rarity": 103,
            "type": "treeFrog(2)",
            "ranking": 1047
        },
        {
            "id": 2891,
            "rarity": 103,
            "type": "splendidLeafFrog",
            "ranking": 1048
        },
        {
            "id": 3478,
            "rarity": 103,
            "type": "treeFrog(1)",
            "ranking": 1049
        },
        {
            "id": 3620,
            "rarity": 103,
            "type": "splendidLeafFrog",
            "ranking": 1050
        },
        {
            "id": 211,
            "rarity": 102,
            "type": "treeFrog(1)",
            "ranking": 1051
        },
        {
            "id": 312,
            "rarity": 102,
            "type": "treeFrog(4)",
            "ranking": 1052
        },
        {
            "id": 976,
            "rarity": 102,
            "type": "treeFrog(2)",
            "ranking": 1053
        },
        {
            "id": 1087,
            "rarity": 102,
            "type": "croaking",
            "ranking": 1054
        },
        {
            "id": 1766,
            "rarity": 102,
            "type": "goldenTreeFrog",
            "ranking": 1055
        },
        {
            "id": 2095,
            "rarity": 102,
            "type": "treeFrog(4)",
            "ranking": 1056
        },
        {
            "id": 2358,
            "rarity": 102,
            "type": "goldenTreeFrog",
            "ranking": 1057
        },
        {
            "id": 2683,
            "rarity": 102,
            "type": "goldenTreeFrog",
            "ranking": 1058
        },
        {
            "id": 3015,
            "rarity": 102,
            "type": "purpleTreeFrog",
            "ranking": 1059
        },
        {
            "id": 3172,
            "rarity": 102,
            "type": "treeFrog(2)",
            "ranking": 1060
        },
        {
            "id": 3354,
            "rarity": 102,
            "type": "treeFrog(2)",
            "ranking": 1061
        },
        {
            "id": 3417,
            "rarity": 102,
            "type": "treeFrog(3)",
            "ranking": 1062
        },
        {
            "id": 3493,
            "rarity": 102,
            "type": "stawberryDartFrog",
            "ranking": 1063
        },
        {
            "id": 4011,
            "rarity": 102,
            "type": "treeFrog(4)",
            "ranking": 1064
        },
        {
            "id": 163,
            "rarity": 101,
            "type": "goldenTreeFrog",
            "ranking": 1065
        },
        {
            "id": 174,
            "rarity": 101,
            "type": "treeFrog(2)",
            "ranking": 1066
        },
        {
            "id": 547,
            "rarity": 101,
            "type": "treeFrog(6)",
            "ranking": 1067
        },
        {
            "id": 655,
            "rarity": 101,
            "type": "treeFrog(3)",
            "ranking": 1068
        },
        {
            "id": 1133,
            "rarity": 101,
            "type": "blueDartFrog",
            "ranking": 1069
        },
        {
            "id": 1162,
            "rarity": 101,
            "type": "splendidLeafFrog",
            "ranking": 1070
        },
        {
            "id": 1215,
            "rarity": 101,
            "type": "treeFrog(4)",
            "ranking": 1071
        },
        {
            "id": 1263,
            "rarity": 101,
            "type": "purpleTreeFrog",
            "ranking": 1072
        },
        {
            "id": 1358,
            "rarity": 101,
            "type": "treeFrog(2)",
            "ranking": 1073
        },
        {
            "id": 1387,
            "rarity": 101,
            "type": "treeFrog(1)",
            "ranking": 1074
        },
        {
            "id": 1524,
            "rarity": 101,
            "type": "goldenTreeFrog",
            "ranking": 1075
        },
        {
            "id": 1637,
            "rarity": 101,
            "type": "orangeTreeFrog",
            "ranking": 1076
        },
        {
            "id": 1751,
            "rarity": 101,
            "type": "goldenTreeFrog",
            "ranking": 1077
        },
        {
            "id": 1886,
            "rarity": 101,
            "type": "goldenTreeFrog",
            "ranking": 1078
        },
        {
            "id": 2111,
            "rarity": 101,
            "type": "purpleTreeFrog",
            "ranking": 1079
        },
        {
            "id": 2366,
            "rarity": 101,
            "type": "purpleTreeFrog",
            "ranking": 1080
        },
        {
            "id": 2909,
            "rarity": 101,
            "type": "goldenTreeFrog",
            "ranking": 1081
        },
        {
            "id": 2918,
            "rarity": 101,
            "type": "pinkTreeFrog",
            "ranking": 1082
        },
        {
            "id": 3730,
            "rarity": 101,
            "type": "treeFrog(3)",
            "ranking": 1083
        },
        {
            "id": 3923,
            "rarity": 101,
            "type": "treeFrog(4)",
            "ranking": 1084
        },
        {
            "id": 90,
            "rarity": 100,
            "type": "treeFrog(2)",
            "ranking": 1085
        },
        {
            "id": 592,
            "rarity": 100,
            "type": "pinkTreeFrog",
            "ranking": 1086
        },
        {
            "id": 736,
            "rarity": 100,
            "type": "treeFrog(2)",
            "ranking": 1087
        },
        {
            "id": 781,
            "rarity": 100,
            "type": "splendidLeafFrog",
            "ranking": 1088
        },
        {
            "id": 1013,
            "rarity": 100,
            "type": "treeFrog(5)",
            "ranking": 1089
        },
        {
            "id": 1033,
            "rarity": 100,
            "type": "goldenTreeFrog",
            "ranking": 1090
        },
        {
            "id": 1170,
            "rarity": 100,
            "type": "treeFrog(2)",
            "ranking": 1091
        },
        {
            "id": 1291,
            "rarity": 100,
            "type": "treeFrog(2)",
            "ranking": 1092
        },
        {
            "id": 1469,
            "rarity": 100,
            "type": "orangeTreeFrog",
            "ranking": 1093
        },
        {
            "id": 1827,
            "rarity": 100,
            "type": "goldenTreeFrog",
            "ranking": 1094
        },
        {
            "id": 1854,
            "rarity": 100,
            "type": "treeFrog(2)",
            "ranking": 1095
        },
        {
            "id": 2315,
            "rarity": 100,
            "type": "blueDartFrog",
            "ranking": 1096
        },
        {
            "id": 2402,
            "rarity": 100,
            "type": "orangeTreeFrog",
            "ranking": 1097
        },
        {
            "id": 2552,
            "rarity": 100,
            "type": "treeFrog(2)",
            "ranking": 1098
        },
        {
            "id": 2588,
            "rarity": 100,
            "type": "treeFrog(2)",
            "ranking": 1099
        },
        {
            "id": 2599,
            "rarity": 100,
            "type": "purpleTreeFrog",
            "ranking": 1100
        },
        {
            "id": 2705,
            "rarity": 100,
            "type": "goldenTreeFrog",
            "ranking": 1101
        },
        {
            "id": 3100,
            "rarity": 100,
            "type": "blueDartFrog",
            "ranking": 1102
        },
        {
            "id": 3215,
            "rarity": 100,
            "type": "treeFrog(2)",
            "ranking": 1103
        },
        {
            "id": 3293,
            "rarity": 100,
            "type": "treeFrog(1)",
            "ranking": 1104
        },
        {
            "id": 3885,
            "rarity": 100,
            "type": "purpleTreeFrog",
            "ranking": 1105
        },
        {
            "id": 3994,
            "rarity": 100,
            "type": "treeFrog(2)",
            "ranking": 1106
        },
        {
            "id": 40,
            "rarity": 99,
            "type": "treeFrog(2)",
            "ranking": 1107
        },
        {
            "id": 109,
            "rarity": 99,
            "type": "goldenTreeFrog",
            "ranking": 1108
        },
        {
            "id": 129,
            "rarity": 99,
            "type": "treeFrog(2)",
            "ranking": 1109
        },
        {
            "id": 147,
            "rarity": 99,
            "type": "treeFrog(2)",
            "ranking": 1110
        },
        {
            "id": 403,
            "rarity": 99,
            "type": "treeFrog(3)",
            "ranking": 1111
        },
        {
            "id": 437,
            "rarity": 99,
            "type": "purpleTreeFrog",
            "ranking": 1112
        },
        {
            "id": 575,
            "rarity": 99,
            "type": "treeFrog(3)",
            "ranking": 1113
        },
        {
            "id": 591,
            "rarity": 99,
            "type": "treeFrog(2)",
            "ranking": 1114
        },
        {
            "id": 623,
            "rarity": 99,
            "type": "treeFrog(2)",
            "ranking": 1115
        },
        {
            "id": 713,
            "rarity": 99,
            "type": "tomatoFrog",
            "ranking": 1116
        },
        {
            "id": 802,
            "rarity": 99,
            "type": "goldenTreeFrog",
            "ranking": 1117
        },
        {
            "id": 1048,
            "rarity": 99,
            "type": "grayTreeFrog",
            "ranking": 1118
        },
        {
            "id": 1067,
            "rarity": 99,
            "type": "inversedEyes",
            "ranking": 1119
        },
        {
            "id": 1289,
            "rarity": 99,
            "type": "treeFrog(2)",
            "ranking": 1120
        },
        {
            "id": 1410,
            "rarity": 99,
            "type": "splendidLeafFrog",
            "ranking": 1121
        },
        {
            "id": 1565,
            "rarity": 99,
            "type": "treeFrog(2)",
            "ranking": 1122
        },
        {
            "id": 1662,
            "rarity": 99,
            "type": "orangeTreeFrog",
            "ranking": 1123
        },
        {
            "id": 1741,
            "rarity": 99,
            "type": "treeFrog(2)",
            "ranking": 1124
        },
        {
            "id": 1825,
            "rarity": 99,
            "type": "goldenTreeFrog",
            "ranking": 1125
        },
        {
            "id": 2406,
            "rarity": 99,
            "type": "treeFrog(2)",
            "ranking": 1126
        },
        {
            "id": 2454,
            "rarity": 99,
            "type": "purpleTreeFrog",
            "ranking": 1127
        },
        {
            "id": 2521,
            "rarity": 99,
            "type": "orangeTreeFrog",
            "ranking": 1128
        },
        {
            "id": 2554,
            "rarity": 99,
            "type": "treeFrog(4)",
            "ranking": 1129
        },
        {
            "id": 2688,
            "rarity": 99,
            "type": "splendidLeafFrog",
            "ranking": 1130
        },
        {
            "id": 2750,
            "rarity": 99,
            "type": "treeFrog(2)",
            "ranking": 1131
        },
        {
            "id": 2983,
            "rarity": 99,
            "type": "splendidLeafFrog",
            "ranking": 1132
        },
        {
            "id": 3022,
            "rarity": 99,
            "type": "treeFrog(5)",
            "ranking": 1133
        },
        {
            "id": 3222,
            "rarity": 99,
            "type": "treeFrog(5)",
            "ranking": 1134
        },
        {
            "id": 3235,
            "rarity": 99,
            "type": "treeFrog(2)",
            "ranking": 1135
        },
        {
            "id": 3250,
            "rarity": 99,
            "type": "blueDartFrog",
            "ranking": 1136
        },
        {
            "id": 3261,
            "rarity": 99,
            "type": "treeFrog(2)",
            "ranking": 1137
        },
        {
            "id": 3402,
            "rarity": 99,
            "type": "treeFrog(2)",
            "ranking": 1138
        },
        {
            "id": 3852,
            "rarity": 99,
            "type": "pinkTreeFrog",
            "ranking": 1139
        },
        {
            "id": 3864,
            "rarity": 99,
            "type": "treeFrog(1)",
            "ranking": 1140
        },
        {
            "id": 3910,
            "rarity": 99,
            "type": "pinkTreeFrog",
            "ranking": 1141
        },
        {
            "id": 4017,
            "rarity": 99,
            "type": "purpleTreeFrog",
            "ranking": 1142
        },
        {
            "id": 4034,
            "rarity": 99,
            "type": "orangeTreeFrog",
            "ranking": 1143
        },
        {
            "id": 7,
            "rarity": 98,
            "type": "treeFrog(1)",
            "ranking": 1144
        },
        {
            "id": 298,
            "rarity": 98,
            "type": "splendidLeafFrog",
            "ranking": 1145
        },
        {
            "id": 345,
            "rarity": 98,
            "type": "treeFrog(2)",
            "ranking": 1146
        },
        {
            "id": 472,
            "rarity": 98,
            "type": "goldenTreeFrog",
            "ranking": 1147
        },
        {
            "id": 578,
            "rarity": 98,
            "type": "treeFrog(4)",
            "ranking": 1148
        },
        {
            "id": 642,
            "rarity": 98,
            "type": "treeFrog(2)",
            "ranking": 1149
        },
        {
            "id": 868,
            "rarity": 98,
            "type": "blueDartFrog",
            "ranking": 1150
        },
        {
            "id": 1018,
            "rarity": 98,
            "type": "treeFrog(5)",
            "ranking": 1151
        },
        {
            "id": 1057,
            "rarity": 98,
            "type": "treeFrog(8)",
            "ranking": 1152
        },
        {
            "id": 1099,
            "rarity": 98,
            "type": "splendidLeafFrog",
            "ranking": 1153
        },
        {
            "id": 1132,
            "rarity": 98,
            "type": "purpleTreeFrog",
            "ranking": 1154
        },
        {
            "id": 1188,
            "rarity": 98,
            "type": "purpleTreeFrog",
            "ranking": 1155
        },
        {
            "id": 1210,
            "rarity": 98,
            "type": "greenTreeFrog",
            "ranking": 1156
        },
        {
            "id": 1231,
            "rarity": 98,
            "type": "treeFrog(3)",
            "ranking": 1157
        },
        {
            "id": 1337,
            "rarity": 98,
            "type": "splendidLeafFrog",
            "ranking": 1158
        },
        {
            "id": 1356,
            "rarity": 98,
            "type": "treeFrog(8)",
            "ranking": 1159
        },
        {
            "id": 1394,
            "rarity": 98,
            "type": "blueTreeFrog",
            "ranking": 1160
        },
        {
            "id": 1450,
            "rarity": 98,
            "type": "treeFrog(4)",
            "ranking": 1161
        },
        {
            "id": 1477,
            "rarity": 98,
            "type": "treeFrog(2)",
            "ranking": 1162
        },
        {
            "id": 1479,
            "rarity": 98,
            "type": "blueDartFrog",
            "ranking": 1163
        },
        {
            "id": 1561,
            "rarity": 98,
            "type": "treeFrog(2)",
            "ranking": 1164
        },
        {
            "id": 1957,
            "rarity": 98,
            "type": "treeFrog(2)",
            "ranking": 1165
        },
        {
            "id": 2045,
            "rarity": 98,
            "type": "splendidLeafFrog",
            "ranking": 1166
        },
        {
            "id": 2061,
            "rarity": 98,
            "type": "treeFrog(2)",
            "ranking": 1167
        },
        {
            "id": 2176,
            "rarity": 98,
            "type": "purpleTreeFrog",
            "ranking": 1168
        },
        {
            "id": 2217,
            "rarity": 98,
            "type": "stawberryDartFrog",
            "ranking": 1169
        },
        {
            "id": 2250,
            "rarity": 98,
            "type": "treeFrog(2)",
            "ranking": 1170
        },
        {
            "id": 2572,
            "rarity": 98,
            "type": "orangeTreeFrog",
            "ranking": 1171
        },
        {
            "id": 2626,
            "rarity": 98,
            "type": "pinkTreeFrog",
            "ranking": 1172
        },
        {
            "id": 2684,
            "rarity": 98,
            "type": "orangeTreeFrog",
            "ranking": 1173
        },
        {
            "id": 2964,
            "rarity": 98,
            "type": "treeFrog(2)",
            "ranking": 1174
        },
        {
            "id": 3045,
            "rarity": 98,
            "type": "treeFrog(3)",
            "ranking": 1175
        },
        {
            "id": 3097,
            "rarity": 98,
            "type": "tomatoFrog",
            "ranking": 1176
        },
        {
            "id": 3188,
            "rarity": 98,
            "type": "treeFrog(5)",
            "ranking": 1177
        },
        {
            "id": 3251,
            "rarity": 98,
            "type": "pinkTreeFrog",
            "ranking": 1178
        },
        {
            "id": 3387,
            "rarity": 98,
            "type": "treeFrog(4)",
            "ranking": 1179
        },
        {
            "id": 3448,
            "rarity": 98,
            "type": "redEyedTreeFrog",
            "ranking": 1180
        },
        {
            "id": 3470,
            "rarity": 98,
            "type": "treeFrog(1)",
            "ranking": 1181
        },
        {
            "id": 3564,
            "rarity": 98,
            "type": "treeFrog(2)",
            "ranking": 1182
        },
        {
            "id": 3576,
            "rarity": 98,
            "type": "pinkTreeFrog",
            "ranking": 1183
        },
        {
            "id": 3738,
            "rarity": 98,
            "type": "treeFrog(3)",
            "ranking": 1184
        },
        {
            "id": 3819,
            "rarity": 98,
            "type": "stawberryDartFrog",
            "ranking": 1185
        },
        {
            "id": 3838,
            "rarity": 98,
            "type": "treeFrog(4)",
            "ranking": 1186
        },
        {
            "id": 3894,
            "rarity": 98,
            "type": "treeFrog(5)",
            "ranking": 1187
        },
        {
            "id": 337,
            "rarity": 97,
            "type": "blueDartFrog",
            "ranking": 1188
        },
        {
            "id": 348,
            "rarity": 97,
            "type": "treeFrog(3)",
            "ranking": 1189
        },
        {
            "id": 395,
            "rarity": 97,
            "type": "treeFrog(2)",
            "ranking": 1190
        },
        {
            "id": 498,
            "rarity": 97,
            "type": "treeFrog(2)",
            "ranking": 1191
        },
        {
            "id": 668,
            "rarity": 97,
            "type": "treeFrog(3)",
            "ranking": 1192
        },
        {
            "id": 908,
            "rarity": 97,
            "type": "treeFrog(2)",
            "ranking": 1193
        },
        {
            "id": 956,
            "rarity": 97,
            "type": "treeFrog(2)",
            "ranking": 1194
        },
        {
            "id": 1037,
            "rarity": 97,
            "type": "treeFrog(4)",
            "ranking": 1195
        },
        {
            "id": 1203,
            "rarity": 97,
            "type": "treeFrog(5)",
            "ranking": 1196
        },
        {
            "id": 1208,
            "rarity": 97,
            "type": "tomatoFrog",
            "ranking": 1197
        },
        {
            "id": 1466,
            "rarity": 97,
            "type": "treeFrog(2)",
            "ranking": 1198
        },
        {
            "id": 1504,
            "rarity": 97,
            "type": "treeFrog(2)",
            "ranking": 1199
        },
        {
            "id": 1564,
            "rarity": 97,
            "type": "pinkTreeFrog",
            "ranking": 1200
        },
        {
            "id": 1634,
            "rarity": 97,
            "type": "treeFrog(3)",
            "ranking": 1201
        },
        {
            "id": 1640,
            "rarity": 97,
            "type": "splendidLeafFrog",
            "ranking": 1202
        },
        {
            "id": 1674,
            "rarity": 97,
            "type": "blueDartFrog",
            "ranking": 1203
        },
        {
            "id": 1747,
            "rarity": 97,
            "type": "treeFrog(2)",
            "ranking": 1204
        },
        {
            "id": 1844,
            "rarity": 97,
            "type": "splendidLeafFrog",
            "ranking": 1205
        },
        {
            "id": 1864,
            "rarity": 97,
            "type": "treeFrog(2)",
            "ranking": 1206
        },
        {
            "id": 1974,
            "rarity": 97,
            "type": "treeFrog(4)",
            "ranking": 1207
        },
        {
            "id": 2030,
            "rarity": 97,
            "type": "orangeTreeFrog",
            "ranking": 1208
        },
        {
            "id": 2126,
            "rarity": 97,
            "type": "treeFrog(2)",
            "ranking": 1209
        },
        {
            "id": 2197,
            "rarity": 97,
            "type": "treeFrog(2)",
            "ranking": 1210
        },
        {
            "id": 2323,
            "rarity": 97,
            "type": "splendidLeafFrog",
            "ranking": 1211
        },
        {
            "id": 2532,
            "rarity": 97,
            "type": "treeFrog(3)",
            "ranking": 1212
        },
        {
            "id": 2638,
            "rarity": 97,
            "type": "treeFrog(2)",
            "ranking": 1213
        },
        {
            "id": 2670,
            "rarity": 97,
            "type": "treeFrog(2)",
            "ranking": 1214
        },
        {
            "id": 2707,
            "rarity": 97,
            "type": "treeFrog(3)",
            "ranking": 1215
        },
        {
            "id": 2741,
            "rarity": 97,
            "type": "grayTreeFrog",
            "ranking": 1216
        },
        {
            "id": 2759,
            "rarity": 97,
            "type": "treeFrog(2)",
            "ranking": 1217
        },
        {
            "id": 2865,
            "rarity": 97,
            "type": "treeFrog(3)",
            "ranking": 1218
        },
        {
            "id": 3030,
            "rarity": 97,
            "type": "treeFrog(6)",
            "ranking": 1219
        },
        {
            "id": 3130,
            "rarity": 97,
            "type": "thirdEye",
            "ranking": 1220
        },
        {
            "id": 3262,
            "rarity": 97,
            "type": "treeFrog(2)",
            "ranking": 1221
        },
        {
            "id": 3274,
            "rarity": 97,
            "type": "blueTreeFrog",
            "ranking": 1222
        },
        {
            "id": 3447,
            "rarity": 97,
            "type": "treeFrog(2)",
            "ranking": 1223
        },
        {
            "id": 3823,
            "rarity": 97,
            "type": "blueTreeFrog",
            "ranking": 1224
        },
        {
            "id": 3858,
            "rarity": 97,
            "type": "treeFrog(3)",
            "ranking": 1225
        },
        {
            "id": 11,
            "rarity": 96,
            "type": "greenTreeFrog",
            "ranking": 1226
        },
        {
            "id": 63,
            "rarity": 96,
            "type": "tomatoFrog",
            "ranking": 1227
        },
        {
            "id": 197,
            "rarity": 96,
            "type": "treeFrog(6)",
            "ranking": 1228
        },
        {
            "id": 282,
            "rarity": 96,
            "type": "pinkTreeFrog",
            "ranking": 1229
        },
        {
            "id": 285,
            "rarity": 96,
            "type": "splendidLeafFrog",
            "ranking": 1230
        },
        {
            "id": 459,
            "rarity": 96,
            "type": "treeFrog(3)",
            "ranking": 1231
        },
        {
            "id": 612,
            "rarity": 96,
            "type": "blueTreeFrog",
            "ranking": 1232
        },
        {
            "id": 692,
            "rarity": 96,
            "type": "treeFrog(4)",
            "ranking": 1233
        },
        {
            "id": 696,
            "rarity": 96,
            "type": "treeFrog(7)",
            "ranking": 1234
        },
        {
            "id": 787,
            "rarity": 96,
            "type": "stawberryDartFrog",
            "ranking": 1235
        },
        {
            "id": 1026,
            "rarity": 96,
            "type": "treeFrog(3)",
            "ranking": 1236
        },
        {
            "id": 1127,
            "rarity": 96,
            "type": "purpleTreeFrog",
            "ranking": 1237
        },
        {
            "id": 1158,
            "rarity": 96,
            "type": "treeFrog(2)",
            "ranking": 1238
        },
        {
            "id": 1259,
            "rarity": 96,
            "type": "treeFrog(4)",
            "ranking": 1239
        },
        {
            "id": 1281,
            "rarity": 96,
            "type": "treeFrog(3)",
            "ranking": 1240
        },
        {
            "id": 1362,
            "rarity": 96,
            "type": "greenTreeFrog",
            "ranking": 1241
        },
        {
            "id": 1612,
            "rarity": 96,
            "type": "treeFrog(5)",
            "ranking": 1242
        },
        {
            "id": 1777,
            "rarity": 96,
            "type": "treeFrog(3)",
            "ranking": 1243
        },
        {
            "id": 1812,
            "rarity": 96,
            "type": "pinkTreeFrog",
            "ranking": 1244
        },
        {
            "id": 1900,
            "rarity": 96,
            "type": "orangeTreeFrog",
            "ranking": 1245
        },
        {
            "id": 1935,
            "rarity": 96,
            "type": "stawberryDartFrog",
            "ranking": 1246
        },
        {
            "id": 1955,
            "rarity": 96,
            "type": "treeFrog(2)",
            "ranking": 1247
        },
        {
            "id": 2033,
            "rarity": 96,
            "type": "goldenTreeFrog",
            "ranking": 1248
        },
        {
            "id": 2062,
            "rarity": 96,
            "type": "grayTreeFrog",
            "ranking": 1249
        },
        {
            "id": 2127,
            "rarity": 96,
            "type": "blueDartFrog",
            "ranking": 1250
        },
        {
            "id": 2135,
            "rarity": 96,
            "type": "treeFrog(3)",
            "ranking": 1251
        },
        {
            "id": 2215,
            "rarity": 96,
            "type": "tomatoFrog",
            "ranking": 1252
        },
        {
            "id": 2329,
            "rarity": 96,
            "type": "greenTreeFrog",
            "ranking": 1253
        },
        {
            "id": 2437,
            "rarity": 96,
            "type": "redEyedTreeFrog",
            "ranking": 1254
        },
        {
            "id": 2446,
            "rarity": 96,
            "type": "treeFrog(2)",
            "ranking": 1255
        },
        {
            "id": 2515,
            "rarity": 96,
            "type": "treeFrog(7)",
            "ranking": 1256
        },
        {
            "id": 2646,
            "rarity": 96,
            "type": "treeFrog(3)",
            "ranking": 1257
        },
        {
            "id": 2689,
            "rarity": 96,
            "type": "treeFrog(5)",
            "ranking": 1258
        },
        {
            "id": 2721,
            "rarity": 96,
            "type": "blueTreeFrog",
            "ranking": 1259
        },
        {
            "id": 2731,
            "rarity": 96,
            "type": "treeFrog(2)",
            "ranking": 1260
        },
        {
            "id": 2842,
            "rarity": 96,
            "type": "treeFrog(1)",
            "ranking": 1261
        },
        {
            "id": 2872,
            "rarity": 96,
            "type": "treeFrog(3)",
            "ranking": 1262
        },
        {
            "id": 2893,
            "rarity": 96,
            "type": "treeFrog(3)",
            "ranking": 1263
        },
        {
            "id": 3016,
            "rarity": 96,
            "type": "treeFrog(3)",
            "ranking": 1264
        },
        {
            "id": 3068,
            "rarity": 96,
            "type": "blueTreeFrog",
            "ranking": 1265
        },
        {
            "id": 3151,
            "rarity": 96,
            "type": "splendidLeafFrog",
            "ranking": 1266
        },
        {
            "id": 3192,
            "rarity": 96,
            "type": "treeFrog(2)",
            "ranking": 1267
        },
        {
            "id": 3297,
            "rarity": 96,
            "type": "blueDartFrog",
            "ranking": 1268
        },
        {
            "id": 3330,
            "rarity": 96,
            "type": "treeFrog(3)",
            "ranking": 1269
        },
        {
            "id": 3401,
            "rarity": 96,
            "type": "tomatoFrog",
            "ranking": 1270
        },
        {
            "id": 3477,
            "rarity": 96,
            "type": "splendidLeafFrog",
            "ranking": 1271
        },
        {
            "id": 3495,
            "rarity": 96,
            "type": "redEyedTreeFrog",
            "ranking": 1272
        },
        {
            "id": 3510,
            "rarity": 96,
            "type": "grayTreeFrog",
            "ranking": 1273
        },
        {
            "id": 3704,
            "rarity": 96,
            "type": "treeFrog(2)",
            "ranking": 1274
        },
        {
            "id": 3710,
            "rarity": 96,
            "type": "greenTreeFrog",
            "ranking": 1275
        },
        {
            "id": 3729,
            "rarity": 96,
            "type": "splendidLeafFrog",
            "ranking": 1276
        },
        {
            "id": 3751,
            "rarity": 96,
            "type": "treeFrog(2)",
            "ranking": 1277
        },
        {
            "id": 3901,
            "rarity": 96,
            "type": "treeFrog(6)",
            "ranking": 1278
        },
        {
            "id": 22,
            "rarity": 95,
            "type": "tomatoFrog",
            "ranking": 1279
        },
        {
            "id": 53,
            "rarity": 95,
            "type": "blueTreeFrog",
            "ranking": 1280
        },
        {
            "id": 94,
            "rarity": 95,
            "type": "treeFrog(3)",
            "ranking": 1281
        },
        {
            "id": 128,
            "rarity": 95,
            "type": "treeFrog(4)",
            "ranking": 1282
        },
        {
            "id": 184,
            "rarity": 95,
            "type": "goldenDartFrog",
            "ranking": 1283
        },
        {
            "id": 233,
            "rarity": 95,
            "type": "treeFrog(3)",
            "ranking": 1284
        },
        {
            "id": 300,
            "rarity": 95,
            "type": "stawberryDartFrog",
            "ranking": 1285
        },
        {
            "id": 399,
            "rarity": 95,
            "type": "treeFrog(3)",
            "ranking": 1286
        },
        {
            "id": 595,
            "rarity": 95,
            "type": "treeFrog(4)",
            "ranking": 1287
        },
        {
            "id": 725,
            "rarity": 95,
            "type": "brownTreeFrog",
            "ranking": 1288
        },
        {
            "id": 910,
            "rarity": 95,
            "type": "treeFrog(4)",
            "ranking": 1289
        },
        {
            "id": 917,
            "rarity": 95,
            "type": "unknown",
            "ranking": 1290
        },
        {
            "id": 960,
            "rarity": 95,
            "type": "treeFrog(4)",
            "ranking": 1291
        },
        {
            "id": 996,
            "rarity": 95,
            "type": "treeFrog(4)",
            "ranking": 1292
        },
        {
            "id": 1055,
            "rarity": 95,
            "type": "treeFrog(3)",
            "ranking": 1293
        },
        {
            "id": 1155,
            "rarity": 95,
            "type": "treeFrog(1)",
            "ranking": 1294
        },
        {
            "id": 1169,
            "rarity": 95,
            "type": "treeFrog(2)",
            "ranking": 1295
        },
        {
            "id": 1278,
            "rarity": 95,
            "type": "treeFrog(8)",
            "ranking": 1296
        },
        {
            "id": 1329,
            "rarity": 95,
            "type": "treeFrog(3)",
            "ranking": 1297
        },
        {
            "id": 1330,
            "rarity": 95,
            "type": "treeFrog(2)",
            "ranking": 1298
        },
        {
            "id": 1364,
            "rarity": 95,
            "type": "treeFrog(3)",
            "ranking": 1299
        },
        {
            "id": 1527,
            "rarity": 95,
            "type": "treeFrog(7)",
            "ranking": 1300
        },
        {
            "id": 1558,
            "rarity": 95,
            "type": "blueDartFrog",
            "ranking": 1301
        },
        {
            "id": 1659,
            "rarity": 95,
            "type": "treeFrog(1)",
            "ranking": 1302
        },
        {
            "id": 1749,
            "rarity": 95,
            "type": "unknown",
            "ranking": 1303
        },
        {
            "id": 1791,
            "rarity": 95,
            "type": "stawberryDartFrog",
            "ranking": 1304
        },
        {
            "id": 2012,
            "rarity": 95,
            "type": "treeFrog(5)",
            "ranking": 1305
        },
        {
            "id": 2160,
            "rarity": 95,
            "type": "blueDartFrog",
            "ranking": 1306
        },
        {
            "id": 2201,
            "rarity": 95,
            "type": "treeFrog(1)",
            "ranking": 1307
        },
        {
            "id": 2259,
            "rarity": 95,
            "type": "goldenTreeFrog",
            "ranking": 1308
        },
        {
            "id": 2292,
            "rarity": 95,
            "type": "orangeTreeFrog",
            "ranking": 1309
        },
        {
            "id": 2326,
            "rarity": 95,
            "type": "treeFrog(2)",
            "ranking": 1310
        },
        {
            "id": 2339,
            "rarity": 95,
            "type": "redEyedTreeFrog",
            "ranking": 1311
        },
        {
            "id": 2434,
            "rarity": 95,
            "type": "stawberryDartFrog",
            "ranking": 1312
        },
        {
            "id": 2604,
            "rarity": 95,
            "type": "treeFrog(1)",
            "ranking": 1313
        },
        {
            "id": 2722,
            "rarity": 95,
            "type": "unknown",
            "ranking": 1314
        },
        {
            "id": 2723,
            "rarity": 95,
            "type": "treeFrog(3)",
            "ranking": 1315
        },
        {
            "id": 2746,
            "rarity": 95,
            "type": "treeFrog(5)",
            "ranking": 1316
        },
        {
            "id": 2818,
            "rarity": 95,
            "type": "treeFrog(1)",
            "ranking": 1317
        },
        {
            "id": 2922,
            "rarity": 95,
            "type": "goldenTreeFrog",
            "ranking": 1318
        },
        {
            "id": 3028,
            "rarity": 95,
            "type": "treeFrog(3)",
            "ranking": 1319
        },
        {
            "id": 3115,
            "rarity": 95,
            "type": "treeFrog(2)",
            "ranking": 1320
        },
        {
            "id": 3147,
            "rarity": 95,
            "type": "pinkTreeFrog",
            "ranking": 1321
        },
        {
            "id": 3175,
            "rarity": 95,
            "type": "treeFrog(2)",
            "ranking": 1322
        },
        {
            "id": 3194,
            "rarity": 95,
            "type": "treeFrog(6)",
            "ranking": 1323
        },
        {
            "id": 3200,
            "rarity": 95,
            "type": "purpleTreeFrog",
            "ranking": 1324
        },
        {
            "id": 3201,
            "rarity": 95,
            "type": "treeFrog(6)",
            "ranking": 1325
        },
        {
            "id": 3244,
            "rarity": 95,
            "type": "goldenTreeFrog",
            "ranking": 1326
        },
        {
            "id": 3258,
            "rarity": 95,
            "type": "splendidLeafFrog",
            "ranking": 1327
        },
        {
            "id": 3356,
            "rarity": 95,
            "type": "treeFrog(3)",
            "ranking": 1328
        },
        {
            "id": 3416,
            "rarity": 95,
            "type": "blueDartFrog",
            "ranking": 1329
        },
        {
            "id": 3681,
            "rarity": 95,
            "type": "treeFrog(3)",
            "ranking": 1330
        },
        {
            "id": 3682,
            "rarity": 95,
            "type": "cyanTreeFrog",
            "ranking": 1331
        },
        {
            "id": 3756,
            "rarity": 95,
            "type": "treeFrog(6)",
            "ranking": 1332
        },
        {
            "id": 3912,
            "rarity": 95,
            "type": "treeFrog(3)",
            "ranking": 1333
        },
        {
            "id": 3986,
            "rarity": 95,
            "type": "treeFrog(2)",
            "ranking": 1334
        },
        {
            "id": 3988,
            "rarity": 95,
            "type": "treeFrog(7)",
            "ranking": 1335
        },
        {
            "id": 2,
            "rarity": 94,
            "type": "treeFrog(5)",
            "ranking": 1336
        },
        {
            "id": 9,
            "rarity": 94,
            "type": "treeFrog(4)",
            "ranking": 1337
        },
        {
            "id": 368,
            "rarity": 94,
            "type": "unknown",
            "ranking": 1338
        },
        {
            "id": 383,
            "rarity": 94,
            "type": "treeFrog(4)",
            "ranking": 1339
        },
        {
            "id": 460,
            "rarity": 94,
            "type": "treeFrog(2)",
            "ranking": 1340
        },
        {
            "id": 489,
            "rarity": 94,
            "type": "treeFrog(4)",
            "ranking": 1341
        },
        {
            "id": 693,
            "rarity": 94,
            "type": "treeFrog(3)",
            "ranking": 1342
        },
        {
            "id": 774,
            "rarity": 94,
            "type": "treeFrog(3)",
            "ranking": 1343
        },
        {
            "id": 1226,
            "rarity": 94,
            "type": "grayTreeFrog",
            "ranking": 1344
        },
        {
            "id": 1255,
            "rarity": 94,
            "type": "treeFrog(3)",
            "ranking": 1345
        },
        {
            "id": 1276,
            "rarity": 94,
            "type": "treeFrog(7)",
            "ranking": 1346
        },
        {
            "id": 1413,
            "rarity": 94,
            "type": "treeFrog(3)",
            "ranking": 1347
        },
        {
            "id": 1417,
            "rarity": 94,
            "type": "greenTreeFrog",
            "ranking": 1348
        },
        {
            "id": 1463,
            "rarity": 94,
            "type": "treeFrog(6)",
            "ranking": 1349
        },
        {
            "id": 1532,
            "rarity": 94,
            "type": "treeFrog(3)",
            "ranking": 1350
        },
        {
            "id": 1563,
            "rarity": 94,
            "type": "stawberryDartFrog",
            "ranking": 1351
        },
        {
            "id": 1578,
            "rarity": 94,
            "type": "treeFrog(6)",
            "ranking": 1352
        },
        {
            "id": 1643,
            "rarity": 94,
            "type": "goldenDartFrog",
            "ranking": 1353
        },
        {
            "id": 1691,
            "rarity": 94,
            "type": "orangeTreeFrog",
            "ranking": 1354
        },
        {
            "id": 1786,
            "rarity": 94,
            "type": "splendidLeafFrog",
            "ranking": 1355
        },
        {
            "id": 1830,
            "rarity": 94,
            "type": "orangeTreeFrog",
            "ranking": 1356
        },
        {
            "id": 1911,
            "rarity": 94,
            "type": "treeFrog(3)",
            "ranking": 1357
        },
        {
            "id": 2013,
            "rarity": 94,
            "type": "treeFrog(2)",
            "ranking": 1358
        },
        {
            "id": 2064,
            "rarity": 94,
            "type": "treeFrog(8)",
            "ranking": 1359
        },
        {
            "id": 2068,
            "rarity": 94,
            "type": "treeFrog(7)",
            "ranking": 1360
        },
        {
            "id": 2094,
            "rarity": 94,
            "type": "unknown",
            "ranking": 1361
        },
        {
            "id": 2103,
            "rarity": 94,
            "type": "treeFrog(7)",
            "ranking": 1362
        },
        {
            "id": 2108,
            "rarity": 94,
            "type": "purpleTreeFrog",
            "ranking": 1363
        },
        {
            "id": 2122,
            "rarity": 94,
            "type": "treeFrog(5)",
            "ranking": 1364
        },
        {
            "id": 2165,
            "rarity": 94,
            "type": "treeFrog(3)",
            "ranking": 1365
        },
        {
            "id": 2169,
            "rarity": 94,
            "type": "treeFrog(3)",
            "ranking": 1366
        },
        {
            "id": 2227,
            "rarity": 94,
            "type": "purpleTreeFrog",
            "ranking": 1367
        },
        {
            "id": 2232,
            "rarity": 94,
            "type": "treeFrog(3)",
            "ranking": 1368
        },
        {
            "id": 2440,
            "rarity": 94,
            "type": "treeFrog(3)",
            "ranking": 1369
        },
        {
            "id": 2442,
            "rarity": 94,
            "type": "treeFrog(3)",
            "ranking": 1370
        },
        {
            "id": 2718,
            "rarity": 94,
            "type": "treeFrog(7)",
            "ranking": 1371
        },
        {
            "id": 2790,
            "rarity": 94,
            "type": "treeFrog(3)",
            "ranking": 1372
        },
        {
            "id": 2823,
            "rarity": 94,
            "type": "treeFrog(5)",
            "ranking": 1373
        },
        {
            "id": 2900,
            "rarity": 94,
            "type": "treeFrog(7)",
            "ranking": 1374
        },
        {
            "id": 2969,
            "rarity": 94,
            "type": "treeFrog(1)",
            "ranking": 1375
        },
        {
            "id": 3118,
            "rarity": 94,
            "type": "treeFrog(3)",
            "ranking": 1376
        },
        {
            "id": 3141,
            "rarity": 94,
            "type": "treeFrog(3)",
            "ranking": 1377
        },
        {
            "id": 3156,
            "rarity": 94,
            "type": "treeFrog(4)",
            "ranking": 1378
        },
        {
            "id": 3218,
            "rarity": 94,
            "type": "unknown",
            "ranking": 1379
        },
        {
            "id": 3268,
            "rarity": 94,
            "type": "treeFrog(1)",
            "ranking": 1380
        },
        {
            "id": 3363,
            "rarity": 94,
            "type": "treeFrog(3)",
            "ranking": 1381
        },
        {
            "id": 3364,
            "rarity": 94,
            "type": "blueTreeFrog",
            "ranking": 1382
        },
        {
            "id": 3436,
            "rarity": 94,
            "type": "treeFrog(7)",
            "ranking": 1383
        },
        {
            "id": 3714,
            "rarity": 94,
            "type": "treeFrog(5)",
            "ranking": 1384
        },
        {
            "id": 3722,
            "rarity": 94,
            "type": "treeFrog(3)",
            "ranking": 1385
        },
        {
            "id": 3736,
            "rarity": 94,
            "type": "treeFrog(8)",
            "ranking": 1386
        },
        {
            "id": 3791,
            "rarity": 94,
            "type": "orangeTreeFrog",
            "ranking": 1387
        },
        {
            "id": 3817,
            "rarity": 94,
            "type": "treeFrog(4)",
            "ranking": 1388
        },
        {
            "id": 3827,
            "rarity": 94,
            "type": "treeFrog(8)",
            "ranking": 1389
        },
        {
            "id": 3966,
            "rarity": 94,
            "type": "treeFrog(1)",
            "ranking": 1390
        },
        {
            "id": 76,
            "rarity": 93,
            "type": "treeFrog(5)",
            "ranking": 1391
        },
        {
            "id": 78,
            "rarity": 93,
            "type": "redEyedTreeFrog",
            "ranking": 1392
        },
        {
            "id": 93,
            "rarity": 93,
            "type": "goldenTreeFrog",
            "ranking": 1393
        },
        {
            "id": 187,
            "rarity": 93,
            "type": "goldenDartFrog",
            "ranking": 1394
        },
        {
            "id": 308,
            "rarity": 93,
            "type": "grayTreeFrog",
            "ranking": 1395
        },
        {
            "id": 323,
            "rarity": 93,
            "type": "treeFrog(5)",
            "ranking": 1396
        },
        {
            "id": 355,
            "rarity": 93,
            "type": "stawberryDartFrog",
            "ranking": 1397
        },
        {
            "id": 380,
            "rarity": 93,
            "type": "treeFrog(8)",
            "ranking": 1398
        },
        {
            "id": 417,
            "rarity": 93,
            "type": "purpleTreeFrog",
            "ranking": 1399
        },
        {
            "id": 461,
            "rarity": 93,
            "type": "lightBrownTreeFrog",
            "ranking": 1400
        },
        {
            "id": 510,
            "rarity": 93,
            "type": "treeFrog(6)",
            "ranking": 1401
        },
        {
            "id": 590,
            "rarity": 93,
            "type": "treeFrog(6)",
            "ranking": 1402
        },
        {
            "id": 645,
            "rarity": 93,
            "type": "treeFrog(4)",
            "ranking": 1403
        },
        {
            "id": 783,
            "rarity": 93,
            "type": "treeFrog(7)",
            "ranking": 1404
        },
        {
            "id": 920,
            "rarity": 93,
            "type": "blueDartFrog",
            "ranking": 1405
        },
        {
            "id": 968,
            "rarity": 93,
            "type": "treeFrog(4)",
            "ranking": 1406
        },
        {
            "id": 986,
            "rarity": 93,
            "type": "goldenTreeFrog",
            "ranking": 1407
        },
        {
            "id": 1040,
            "rarity": 93,
            "type": "blueDartFrog",
            "ranking": 1408
        },
        {
            "id": 1083,
            "rarity": 93,
            "type": "orangeTreeFrog",
            "ranking": 1409
        },
        {
            "id": 1113,
            "rarity": 93,
            "type": "treeFrog(4)",
            "ranking": 1410
        },
        {
            "id": 1207,
            "rarity": 93,
            "type": "treeFrog(3)",
            "ranking": 1411
        },
        {
            "id": 1240,
            "rarity": 93,
            "type": "treeFrog(3)",
            "ranking": 1412
        },
        {
            "id": 1270,
            "rarity": 93,
            "type": "grayTreeFrog",
            "ranking": 1413
        },
        {
            "id": 1382,
            "rarity": 93,
            "type": "goldenTreeFrog",
            "ranking": 1414
        },
        {
            "id": 1451,
            "rarity": 93,
            "type": "blueTreeFrog",
            "ranking": 1415
        },
        {
            "id": 1506,
            "rarity": 93,
            "type": "redEyedTreeFrog",
            "ranking": 1416
        },
        {
            "id": 1530,
            "rarity": 93,
            "type": "tomatoFrog",
            "ranking": 1417
        },
        {
            "id": 1544,
            "rarity": 93,
            "type": "grayTreeFrog",
            "ranking": 1418
        },
        {
            "id": 1602,
            "rarity": 93,
            "type": "treeFrog(3)",
            "ranking": 1419
        },
        {
            "id": 1689,
            "rarity": 93,
            "type": "orangeTreeFrog",
            "ranking": 1420
        },
        {
            "id": 1950,
            "rarity": 93,
            "type": "purpleTreeFrog",
            "ranking": 1421
        },
        {
            "id": 1995,
            "rarity": 93,
            "type": "tomatoFrog",
            "ranking": 1422
        },
        {
            "id": 2087,
            "rarity": 93,
            "type": "orangeTreeFrog",
            "ranking": 1423
        },
        {
            "id": 2140,
            "rarity": 93,
            "type": "treeFrog(6)",
            "ranking": 1424
        },
        {
            "id": 2144,
            "rarity": 93,
            "type": "treeFrog(4)",
            "ranking": 1425
        },
        {
            "id": 2147,
            "rarity": 93,
            "type": "tomatoFrog",
            "ranking": 1426
        },
        {
            "id": 2234,
            "rarity": 93,
            "type": "treeFrog(4)",
            "ranking": 1427
        },
        {
            "id": 2256,
            "rarity": 93,
            "type": "treeFrog(6)",
            "ranking": 1428
        },
        {
            "id": 2322,
            "rarity": 93,
            "type": "treeFrog(5)",
            "ranking": 1429
        },
        {
            "id": 2328,
            "rarity": 93,
            "type": "treeFrog(2)",
            "ranking": 1430
        },
        {
            "id": 2398,
            "rarity": 93,
            "type": "treeFrog(5)",
            "ranking": 1431
        },
        {
            "id": 2415,
            "rarity": 93,
            "type": "greenTreeFrog",
            "ranking": 1432
        },
        {
            "id": 2421,
            "rarity": 93,
            "type": "treeFrog(4)",
            "ranking": 1433
        },
        {
            "id": 2494,
            "rarity": 93,
            "type": "treeFrog(8)",
            "ranking": 1434
        },
        {
            "id": 2531,
            "rarity": 93,
            "type": "grayTreeFrog",
            "ranking": 1435
        },
        {
            "id": 2564,
            "rarity": 93,
            "type": "stawberryDartFrog",
            "ranking": 1436
        },
        {
            "id": 2685,
            "rarity": 93,
            "type": "treeFrog(8)",
            "ranking": 1437
        },
        {
            "id": 2695,
            "rarity": 93,
            "type": "treeFrog(3)",
            "ranking": 1438
        },
        {
            "id": 2703,
            "rarity": 93,
            "type": "treeFrog(3)",
            "ranking": 1439
        },
        {
            "id": 2724,
            "rarity": 93,
            "type": "treeFrog(6)",
            "ranking": 1440
        },
        {
            "id": 2756,
            "rarity": 93,
            "type": "treeFrog(2)",
            "ranking": 1441
        },
        {
            "id": 2763,
            "rarity": 93,
            "type": "blueDartFrog",
            "ranking": 1442
        },
        {
            "id": 2814,
            "rarity": 93,
            "type": "treeFrog(3)",
            "ranking": 1443
        },
        {
            "id": 2828,
            "rarity": 93,
            "type": "treeFrog(4)",
            "ranking": 1444
        },
        {
            "id": 2883,
            "rarity": 93,
            "type": "treeFrog(3)",
            "ranking": 1445
        },
        {
            "id": 3041,
            "rarity": 93,
            "type": "treeFrog(5)",
            "ranking": 1446
        },
        {
            "id": 3059,
            "rarity": 93,
            "type": "greenTreeFrog",
            "ranking": 1447
        },
        {
            "id": 3114,
            "rarity": 93,
            "type": "treeFrog(3)",
            "ranking": 1448
        },
        {
            "id": 3144,
            "rarity": 93,
            "type": "treeFrog(1)",
            "ranking": 1449
        },
        {
            "id": 3273,
            "rarity": 93,
            "type": "treeFrog(5)",
            "ranking": 1450
        },
        {
            "id": 3278,
            "rarity": 93,
            "type": "goldenTreeFrog",
            "ranking": 1451
        },
        {
            "id": 3355,
            "rarity": 93,
            "type": "pinkTreeFrog",
            "ranking": 1452
        },
        {
            "id": 3456,
            "rarity": 93,
            "type": "treeFrog(4)",
            "ranking": 1453
        },
        {
            "id": 3472,
            "rarity": 93,
            "type": "orangeTreeFrog",
            "ranking": 1454
        },
        {
            "id": 3578,
            "rarity": 93,
            "type": "tomatoFrog",
            "ranking": 1455
        },
        {
            "id": 3699,
            "rarity": 93,
            "type": "treeFrog(3)",
            "ranking": 1456
        },
        {
            "id": 3709,
            "rarity": 93,
            "type": "greenTreeFrog",
            "ranking": 1457
        },
        {
            "id": 3777,
            "rarity": 93,
            "type": "treeFrog(5)",
            "ranking": 1458
        },
        {
            "id": 3992,
            "rarity": 93,
            "type": "stawberryDartFrog",
            "ranking": 1459
        },
        {
            "id": 175,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1460
        },
        {
            "id": 203,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1461
        },
        {
            "id": 219,
            "rarity": 92,
            "type": "treeFrog(8)",
            "ranking": 1462
        },
        {
            "id": 258,
            "rarity": 92,
            "type": "unknown",
            "ranking": 1463
        },
        {
            "id": 260,
            "rarity": 92,
            "type": "grayTreeFrog",
            "ranking": 1464
        },
        {
            "id": 313,
            "rarity": 92,
            "type": "blueTreeFrog",
            "ranking": 1465
        },
        {
            "id": 376,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1466
        },
        {
            "id": 442,
            "rarity": 92,
            "type": "treeFrog(2)",
            "ranking": 1467
        },
        {
            "id": 443,
            "rarity": 92,
            "type": "lightBrownTreeFrog",
            "ranking": 1468
        },
        {
            "id": 488,
            "rarity": 92,
            "type": "treeFrog(7)",
            "ranking": 1469
        },
        {
            "id": 509,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1470
        },
        {
            "id": 532,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1471
        },
        {
            "id": 534,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1472
        },
        {
            "id": 539,
            "rarity": 92,
            "type": "stawberryDartFrog",
            "ranking": 1473
        },
        {
            "id": 555,
            "rarity": 92,
            "type": "treeFrog(2)",
            "ranking": 1474
        },
        {
            "id": 604,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1475
        },
        {
            "id": 657,
            "rarity": 92,
            "type": "pinkTreeFrog",
            "ranking": 1476
        },
        {
            "id": 685,
            "rarity": 92,
            "type": "treeFrog(5)",
            "ranking": 1477
        },
        {
            "id": 694,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1478
        },
        {
            "id": 695,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1479
        },
        {
            "id": 704,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1480
        },
        {
            "id": 759,
            "rarity": 92,
            "type": "purpleTreeFrog",
            "ranking": 1481
        },
        {
            "id": 798,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1482
        },
        {
            "id": 813,
            "rarity": 92,
            "type": "treeFrog(8)",
            "ranking": 1483
        },
        {
            "id": 839,
            "rarity": 92,
            "type": "treeFrog(5)",
            "ranking": 1484
        },
        {
            "id": 842,
            "rarity": 92,
            "type": "treeFrog(2)",
            "ranking": 1485
        },
        {
            "id": 844,
            "rarity": 92,
            "type": "goldenDartFrog",
            "ranking": 1486
        },
        {
            "id": 977,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1487
        },
        {
            "id": 1176,
            "rarity": 92,
            "type": "orangeTreeFrog",
            "ranking": 1488
        },
        {
            "id": 1179,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1489
        },
        {
            "id": 1187,
            "rarity": 92,
            "type": "blueTreeFrog",
            "ranking": 1490
        },
        {
            "id": 1214,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1491
        },
        {
            "id": 1265,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1492
        },
        {
            "id": 1275,
            "rarity": 92,
            "type": "orangeTreeFrog",
            "ranking": 1493
        },
        {
            "id": 1340,
            "rarity": 92,
            "type": "lightBrownTreeFrog",
            "ranking": 1494
        },
        {
            "id": 1357,
            "rarity": 92,
            "type": "pinkTreeFrog",
            "ranking": 1495
        },
        {
            "id": 1418,
            "rarity": 92,
            "type": "unknown",
            "ranking": 1496
        },
        {
            "id": 1425,
            "rarity": 92,
            "type": "treeFrog(7)",
            "ranking": 1497
        },
        {
            "id": 1470,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1498
        },
        {
            "id": 1516,
            "rarity": 92,
            "type": "treeFrog(1)",
            "ranking": 1499
        },
        {
            "id": 1529,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1500
        },
        {
            "id": 1715,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1501
        },
        {
            "id": 1746,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1502
        },
        {
            "id": 1761,
            "rarity": 92,
            "type": "treeFrog(6)",
            "ranking": 1503
        },
        {
            "id": 1780,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1504
        },
        {
            "id": 1787,
            "rarity": 92,
            "type": "grayTreeFrog",
            "ranking": 1505
        },
        {
            "id": 1824,
            "rarity": 92,
            "type": "treeFrog(6)",
            "ranking": 1506
        },
        {
            "id": 1838,
            "rarity": 92,
            "type": "treeFrog(7)",
            "ranking": 1507
        },
        {
            "id": 1867,
            "rarity": 92,
            "type": "treeFrog(5)",
            "ranking": 1508
        },
        {
            "id": 1878,
            "rarity": 92,
            "type": "greenTreeFrog",
            "ranking": 1509
        },
        {
            "id": 1913,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1510
        },
        {
            "id": 2026,
            "rarity": 92,
            "type": "treeFrog(8)",
            "ranking": 1511
        },
        {
            "id": 2038,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1512
        },
        {
            "id": 2055,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1513
        },
        {
            "id": 2098,
            "rarity": 92,
            "type": "purpleTreeFrog",
            "ranking": 1514
        },
        {
            "id": 2158,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1515
        },
        {
            "id": 2162,
            "rarity": 92,
            "type": "treeFrog(7)",
            "ranking": 1516
        },
        {
            "id": 2291,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1517
        },
        {
            "id": 2549,
            "rarity": 92,
            "type": "treeFrog(5)",
            "ranking": 1518
        },
        {
            "id": 2632,
            "rarity": 92,
            "type": "redEyedTreeFrog",
            "ranking": 1519
        },
        {
            "id": 2850,
            "rarity": 92,
            "type": "treeFrog(6)",
            "ranking": 1520
        },
        {
            "id": 2903,
            "rarity": 92,
            "type": "treeFrog(6)",
            "ranking": 1521
        },
        {
            "id": 2930,
            "rarity": 92,
            "type": "treeFrog(7)",
            "ranking": 1522
        },
        {
            "id": 2982,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1523
        },
        {
            "id": 3026,
            "rarity": 92,
            "type": "cyanTreeFrog",
            "ranking": 1524
        },
        {
            "id": 3061,
            "rarity": 92,
            "type": "purpleTreeFrog",
            "ranking": 1525
        },
        {
            "id": 3064,
            "rarity": 92,
            "type": "treeFrog(1)",
            "ranking": 1526
        },
        {
            "id": 3087,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1527
        },
        {
            "id": 3178,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1528
        },
        {
            "id": 3180,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1529
        },
        {
            "id": 3241,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1530
        },
        {
            "id": 3284,
            "rarity": 92,
            "type": "orangeTreeFrog",
            "ranking": 1531
        },
        {
            "id": 3333,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1532
        },
        {
            "id": 3349,
            "rarity": 92,
            "type": "treeFrog(5)",
            "ranking": 1533
        },
        {
            "id": 3388,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1534
        },
        {
            "id": 3567,
            "rarity": 92,
            "type": "orangeTreeFrog",
            "ranking": 1535
        },
        {
            "id": 3583,
            "rarity": 92,
            "type": "treeFrog(5)",
            "ranking": 1536
        },
        {
            "id": 3612,
            "rarity": 92,
            "type": "treeFrog(7)",
            "ranking": 1537
        },
        {
            "id": 3628,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1538
        },
        {
            "id": 3847,
            "rarity": 92,
            "type": "treeFrog(3)",
            "ranking": 1539
        },
        {
            "id": 3925,
            "rarity": 92,
            "type": "pinkTreeFrog",
            "ranking": 1540
        },
        {
            "id": 3947,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1541
        },
        {
            "id": 3960,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1542
        },
        {
            "id": 4004,
            "rarity": 92,
            "type": "treeFrog(4)",
            "ranking": 1543
        },
        {
            "id": 13,
            "rarity": 91,
            "type": "purpleTreeFrog",
            "ranking": 1544
        },
        {
            "id": 85,
            "rarity": 91,
            "type": "redEyedTreeFrog",
            "ranking": 1545
        },
        {
            "id": 207,
            "rarity": 91,
            "type": "stawberryDartFrog",
            "ranking": 1546
        },
        {
            "id": 214,
            "rarity": 91,
            "type": "blueDartFrog",
            "ranking": 1547
        },
        {
            "id": 250,
            "rarity": 91,
            "type": "lightBrownTreeFrog",
            "ranking": 1548
        },
        {
            "id": 328,
            "rarity": 91,
            "type": "treeFrog(4)",
            "ranking": 1549
        },
        {
            "id": 381,
            "rarity": 91,
            "type": "treeFrog(4)",
            "ranking": 1550
        },
        {
            "id": 413,
            "rarity": 91,
            "type": "treeFrog(1)",
            "ranking": 1551
        },
        {
            "id": 425,
            "rarity": 91,
            "type": "treeFrog(8)",
            "ranking": 1552
        },
        {
            "id": 463,
            "rarity": 91,
            "type": "purpleTreeFrog",
            "ranking": 1553
        },
        {
            "id": 584,
            "rarity": 91,
            "type": "treeFrog(5)",
            "ranking": 1554
        },
        {
            "id": 606,
            "rarity": 91,
            "type": "blueTreeFrog",
            "ranking": 1555
        },
        {
            "id": 676,
            "rarity": 91,
            "type": "blueDartFrog",
            "ranking": 1556
        },
        {
            "id": 740,
            "rarity": 91,
            "type": "treeFrog(4)",
            "ranking": 1557
        },
        {
            "id": 767,
            "rarity": 91,
            "type": "treeFrog(4)",
            "ranking": 1558
        },
        {
            "id": 772,
            "rarity": 91,
            "type": "treeFrog(3)",
            "ranking": 1559
        },
        {
            "id": 789,
            "rarity": 91,
            "type": "treeFrog(4)",
            "ranking": 1560
        },
        {
            "id": 852,
            "rarity": 91,
            "type": "treeFrog(6)",
            "ranking": 1561
        },
        {
            "id": 878,
            "rarity": 91,
            "type": "treeFrog(3)",
            "ranking": 1562
        },
        {
            "id": 879,
            "rarity": 91,
            "type": "treeFrog(8)",
            "ranking": 1563
        },
        {
            "id": 937,
            "rarity": 91,
            "type": "treeFrog(8)",
            "ranking": 1564
        },
        {
            "id": 944,
            "rarity": 91,
            "type": "treeFrog(6)",
            "ranking": 1565
        },
        {
            "id": 950,
            "rarity": 91,
            "type": "treeFrog(8)",
            "ranking": 1566
        },
        {
            "id": 1030,
            "rarity": 91,
            "type": "treeFrog(6)",
            "ranking": 1567
        },
        {
            "id": 1031,
            "rarity": 91,
            "type": "cyanTreeFrog",
            "ranking": 1568
        },
        {
            "id": 1050,
            "rarity": 91,
            "type": "treeFrog(6)",
            "ranking": 1569
        },
        {
            "id": 1051,
            "rarity": 91,
            "type": "treeFrog(6)",
            "ranking": 1570
        },
        {
            "id": 1092,
            "rarity": 91,
            "type": "treeFrog(8)",
            "ranking": 1571
        },
        {
            "id": 1110,
            "rarity": 91,
            "type": "treeFrog(4)",
            "ranking": 1572
        },
        {
            "id": 1124,
            "rarity": 91,
            "type": "greenTreeFrog",
            "ranking": 1573
        },
        {
            "id": 1204,
            "rarity": 91,
            "type": "stawberryDartFrog",
            "ranking": 1574
        },
        {
            "id": 1252,
            "rarity": 91,
            "type": "treeFrog(3)",
            "ranking": 1575
        },
        {
            "id": 1253,
            "rarity": 91,
            "type": "cyanTreeFrog",
            "ranking": 1576
        },
        {
            "id": 1336,
            "rarity": 91,
            "type": "pinkTreeFrog",
            "ranking": 1577
        },
        {
            "id": 1343,
            "rarity": 91,
            "type": "stawberryDartFrog",
            "ranking": 1578
        },
        {
            "id": 1344,
            "rarity": 91,
            "type": "treeFrog(3)",
            "ranking": 1579
        },
        {
            "id": 1355,
            "rarity": 91,
            "type": "treeFrog(5)",
            "ranking": 1580
        },
        {
            "id": 1365,
            "rarity": 91,
            "type": "purpleTreeFrog",
            "ranking": 1581
        },
        {
            "id": 1464,
            "rarity": 91,
            "type": "lightBrownTreeFrog",
            "ranking": 1582
        },
        {
            "id": 1523,
            "rarity": 91,
            "type": "treeFrog(3)",
            "ranking": 1583
        },
        {
            "id": 1760,
            "rarity": 91,
            "type": "brownTreeFrog",
            "ranking": 1584
        },
        {
            "id": 1839,
            "rarity": 91,
            "type": "treeFrog(4)",
            "ranking": 1585
        },
        {
            "id": 1857,
            "rarity": 91,
            "type": "treeFrog(8)",
            "ranking": 1586
        },
        {
            "id": 1879,
            "rarity": 91,
            "type": "treeFrog(5)",
            "ranking": 1587
        },
        {
            "id": 2040,
            "rarity": 91,
            "type": "treeFrog(7)",
            "ranking": 1588
        },
        {
            "id": 2084,
            "rarity": 91,
            "type": "pinkTreeFrog",
            "ranking": 1589
        },
        {
            "id": 2099,
            "rarity": 91,
            "type": "treeFrog(3)",
            "ranking": 1590
        },
        {
            "id": 2177,
            "rarity": 91,
            "type": "treeFrog(3)",
            "ranking": 1591
        },
        {
            "id": 2211,
            "rarity": 91,
            "type": "treeFrog(3)",
            "ranking": 1592
        },
        {
            "id": 2262,
            "rarity": 91,
            "type": "treeFrog(5)",
            "ranking": 1593
        },
        {
            "id": 2283,
            "rarity": 91,
            "type": "treeFrog(5)",
            "ranking": 1594
        },
        {
            "id": 2435,
            "rarity": 91,
            "type": "treeFrog(7)",
            "ranking": 1595
        },
        {
            "id": 2502,
            "rarity": 91,
            "type": "treeFrog(2)",
            "ranking": 1596
        },
        {
            "id": 2513,
            "rarity": 91,
            "type": "pinkTreeFrog",
            "ranking": 1597
        },
        {
            "id": 2538,
            "rarity": 91,
            "type": "treeFrog(4)",
            "ranking": 1598
        },
        {
            "id": 2582,
            "rarity": 91,
            "type": "treeFrog(5)",
            "ranking": 1599
        },
        {
            "id": 2639,
            "rarity": 91,
            "type": "treeFrog(1)",
            "ranking": 1600
        },
        {
            "id": 2655,
            "rarity": 91,
            "type": "treeFrog(3)",
            "ranking": 1601
        },
        {
            "id": 2714,
            "rarity": 91,
            "type": "treeFrog(4)",
            "ranking": 1602
        },
        {
            "id": 2748,
            "rarity": 91,
            "type": "grayTreeFrog",
            "ranking": 1603
        },
        {
            "id": 2811,
            "rarity": 91,
            "type": "treeFrog(8)",
            "ranking": 1604
        },
        {
            "id": 2852,
            "rarity": 91,
            "type": "treeFrog(1)",
            "ranking": 1605
        },
        {
            "id": 2913,
            "rarity": 91,
            "type": "blueTreeFrog",
            "ranking": 1606
        },
        {
            "id": 2981,
            "rarity": 91,
            "type": "treeFrog(4)",
            "ranking": 1607
        },
        {
            "id": 3009,
            "rarity": 91,
            "type": "cyanTreeFrog",
            "ranking": 1608
        },
        {
            "id": 3032,
            "rarity": 91,
            "type": "treeFrog(5)",
            "ranking": 1609
        },
        {
            "id": 3043,
            "rarity": 91,
            "type": "treeFrog(4)",
            "ranking": 1610
        },
        {
            "id": 3074,
            "rarity": 91,
            "type": "treeFrog(5)",
            "ranking": 1611
        },
        {
            "id": 3148,
            "rarity": 91,
            "type": "treeFrog(5)",
            "ranking": 1612
        },
        {
            "id": 3219,
            "rarity": 91,
            "type": "stawberryDartFrog",
            "ranking": 1613
        },
        {
            "id": 3237,
            "rarity": 91,
            "type": "treeFrog(4)",
            "ranking": 1614
        },
        {
            "id": 3272,
            "rarity": 91,
            "type": "goldenDartFrog",
            "ranking": 1615
        },
        {
            "id": 3304,
            "rarity": 91,
            "type": "treeFrog(5)",
            "ranking": 1616
        },
        {
            "id": 3408,
            "rarity": 91,
            "type": "treeFrog(5)",
            "ranking": 1617
        },
        {
            "id": 3419,
            "rarity": 91,
            "type": "treeFrog(6)",
            "ranking": 1618
        },
        {
            "id": 3434,
            "rarity": 91,
            "type": "lightBrownTreeFrog",
            "ranking": 1619
        },
        {
            "id": 3437,
            "rarity": 91,
            "type": "treeFrog(5)",
            "ranking": 1620
        },
        {
            "id": 3443,
            "rarity": 91,
            "type": "purpleTreeFrog",
            "ranking": 1621
        },
        {
            "id": 3455,
            "rarity": 91,
            "type": "treeFrog(7)",
            "ranking": 1622
        },
        {
            "id": 3544,
            "rarity": 91,
            "type": "treeFrog(7)",
            "ranking": 1623
        },
        {
            "id": 3582,
            "rarity": 91,
            "type": "treeFrog(5)",
            "ranking": 1624
        },
        {
            "id": 3594,
            "rarity": 91,
            "type": "treeFrog(7)",
            "ranking": 1625
        },
        {
            "id": 3629,
            "rarity": 91,
            "type": "treeFrog(3)",
            "ranking": 1626
        },
        {
            "id": 3649,
            "rarity": 91,
            "type": "treeFrog(5)",
            "ranking": 1627
        },
        {
            "id": 3661,
            "rarity": 91,
            "type": "treeFrog(4)",
            "ranking": 1628
        },
        {
            "id": 3799,
            "rarity": 91,
            "type": "treeFrog(2)",
            "ranking": 1629
        },
        {
            "id": 3840,
            "rarity": 91,
            "type": "redEyedTreeFrog",
            "ranking": 1630
        },
        {
            "id": 3897,
            "rarity": 91,
            "type": "treeFrog(8)",
            "ranking": 1631
        },
        {
            "id": 3964,
            "rarity": 91,
            "type": "treeFrog(4)",
            "ranking": 1632
        },
        {
            "id": 4018,
            "rarity": 91,
            "type": "tomatoFrog",
            "ranking": 1633
        },
        {
            "id": 4024,
            "rarity": 91,
            "type": "lightBrownTreeFrog",
            "ranking": 1634
        },
        {
            "id": 99,
            "rarity": 90,
            "type": "pinkTreeFrog",
            "ranking": 1635
        },
        {
            "id": 108,
            "rarity": 90,
            "type": "treeFrog(3)",
            "ranking": 1636
        },
        {
            "id": 110,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1637
        },
        {
            "id": 121,
            "rarity": 90,
            "type": "treeFrog(3)",
            "ranking": 1638
        },
        {
            "id": 154,
            "rarity": 90,
            "type": "orangeTreeFrog",
            "ranking": 1639
        },
        {
            "id": 190,
            "rarity": 90,
            "type": "treeFrog(7)",
            "ranking": 1640
        },
        {
            "id": 200,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1641
        },
        {
            "id": 215,
            "rarity": 90,
            "type": "treeFrog(3)",
            "ranking": 1642
        },
        {
            "id": 238,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1643
        },
        {
            "id": 288,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1644
        },
        {
            "id": 365,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1645
        },
        {
            "id": 402,
            "rarity": 90,
            "type": "treeFrog(1)",
            "ranking": 1646
        },
        {
            "id": 404,
            "rarity": 90,
            "type": "pinkTreeFrog",
            "ranking": 1647
        },
        {
            "id": 422,
            "rarity": 90,
            "type": "pinkTreeFrog",
            "ranking": 1648
        },
        {
            "id": 500,
            "rarity": 90,
            "type": "blueDartFrog",
            "ranking": 1649
        },
        {
            "id": 527,
            "rarity": 90,
            "type": "blueTreeFrog",
            "ranking": 1650
        },
        {
            "id": 560,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1651
        },
        {
            "id": 646,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1652
        },
        {
            "id": 707,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1653
        },
        {
            "id": 828,
            "rarity": 90,
            "type": "brownTreeFrog",
            "ranking": 1654
        },
        {
            "id": 843,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1655
        },
        {
            "id": 905,
            "rarity": 90,
            "type": "cyanTreeFrog",
            "ranking": 1656
        },
        {
            "id": 913,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1657
        },
        {
            "id": 925,
            "rarity": 90,
            "type": "treeFrog(7)",
            "ranking": 1658
        },
        {
            "id": 946,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1659
        },
        {
            "id": 1059,
            "rarity": 90,
            "type": "pinkTreeFrog",
            "ranking": 1660
        },
        {
            "id": 1084,
            "rarity": 90,
            "type": "orangeTreeFrog",
            "ranking": 1661
        },
        {
            "id": 1175,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1662
        },
        {
            "id": 1216,
            "rarity": 90,
            "type": "treeFrog(7)",
            "ranking": 1663
        },
        {
            "id": 1243,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1664
        },
        {
            "id": 1322,
            "rarity": 90,
            "type": "treeFrog(3)",
            "ranking": 1665
        },
        {
            "id": 1405,
            "rarity": 90,
            "type": "treeFrog(3)",
            "ranking": 1666
        },
        {
            "id": 1415,
            "rarity": 90,
            "type": "pinkTreeFrog",
            "ranking": 1667
        },
        {
            "id": 1434,
            "rarity": 90,
            "type": "treeFrog(3)",
            "ranking": 1668
        },
        {
            "id": 1436,
            "rarity": 90,
            "type": "treeFrog(6)",
            "ranking": 1669
        },
        {
            "id": 1440,
            "rarity": 90,
            "type": "treeFrog(3)",
            "ranking": 1670
        },
        {
            "id": 1487,
            "rarity": 90,
            "type": "treeFrog(2)",
            "ranking": 1671
        },
        {
            "id": 1496,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1672
        },
        {
            "id": 1510,
            "rarity": 90,
            "type": "blueTreeFrog",
            "ranking": 1673
        },
        {
            "id": 1515,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1674
        },
        {
            "id": 1535,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1675
        },
        {
            "id": 1664,
            "rarity": 90,
            "type": "treeFrog(7)",
            "ranking": 1676
        },
        {
            "id": 1697,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1677
        },
        {
            "id": 1722,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1678
        },
        {
            "id": 1733,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1679
        },
        {
            "id": 1815,
            "rarity": 90,
            "type": "treeFrog(3)",
            "ranking": 1680
        },
        {
            "id": 1890,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1681
        },
        {
            "id": 1906,
            "rarity": 90,
            "type": "treeFrog(2)",
            "ranking": 1682
        },
        {
            "id": 1921,
            "rarity": 90,
            "type": "treeFrog(7)",
            "ranking": 1683
        },
        {
            "id": 1992,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1684
        },
        {
            "id": 2023,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1685
        },
        {
            "id": 2028,
            "rarity": 90,
            "type": "treeFrog(8)",
            "ranking": 1686
        },
        {
            "id": 2043,
            "rarity": 90,
            "type": "treeFrog(6)",
            "ranking": 1687
        },
        {
            "id": 2075,
            "rarity": 90,
            "type": "treeFrog(6)",
            "ranking": 1688
        },
        {
            "id": 2102,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1689
        },
        {
            "id": 2216,
            "rarity": 90,
            "type": "orangeTreeFrog",
            "ranking": 1690
        },
        {
            "id": 2370,
            "rarity": 90,
            "type": "treeFrog(8)",
            "ranking": 1691
        },
        {
            "id": 2390,
            "rarity": 90,
            "type": "lightBrownTreeFrog",
            "ranking": 1692
        },
        {
            "id": 2393,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1693
        },
        {
            "id": 2430,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1694
        },
        {
            "id": 2459,
            "rarity": 90,
            "type": "goldenDartFrog",
            "ranking": 1695
        },
        {
            "id": 2535,
            "rarity": 90,
            "type": "tomatoFrog",
            "ranking": 1696
        },
        {
            "id": 2542,
            "rarity": 90,
            "type": "treeFrog(6)",
            "ranking": 1697
        },
        {
            "id": 2593,
            "rarity": 90,
            "type": "brownTreeFrog",
            "ranking": 1698
        },
        {
            "id": 2603,
            "rarity": 90,
            "type": "orangeTreeFrog",
            "ranking": 1699
        },
        {
            "id": 2609,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1700
        },
        {
            "id": 2660,
            "rarity": 90,
            "type": "treeFrog(3)",
            "ranking": 1701
        },
        {
            "id": 2674,
            "rarity": 90,
            "type": "stawberryDartFrog",
            "ranking": 1702
        },
        {
            "id": 2827,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1703
        },
        {
            "id": 2831,
            "rarity": 90,
            "type": "treeFrog(6)",
            "ranking": 1704
        },
        {
            "id": 2839,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1705
        },
        {
            "id": 2845,
            "rarity": 90,
            "type": "goldenDartFrog",
            "ranking": 1706
        },
        {
            "id": 2854,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1707
        },
        {
            "id": 2869,
            "rarity": 90,
            "type": "treeFrog(6)",
            "ranking": 1708
        },
        {
            "id": 2894,
            "rarity": 90,
            "type": "treeFrog(7)",
            "ranking": 1709
        },
        {
            "id": 3053,
            "rarity": 90,
            "type": "orangeTreeFrog",
            "ranking": 1710
        },
        {
            "id": 3075,
            "rarity": 90,
            "type": "tomatoFrog",
            "ranking": 1711
        },
        {
            "id": 3139,
            "rarity": 90,
            "type": "treeFrog(6)",
            "ranking": 1712
        },
        {
            "id": 3165,
            "rarity": 90,
            "type": "treeFrog(3)",
            "ranking": 1713
        },
        {
            "id": 3191,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1714
        },
        {
            "id": 3245,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1715
        },
        {
            "id": 3275,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1716
        },
        {
            "id": 3276,
            "rarity": 90,
            "type": "splendidLeafFrog",
            "ranking": 1717
        },
        {
            "id": 3291,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1718
        },
        {
            "id": 3311,
            "rarity": 90,
            "type": "treeFrog(2)",
            "ranking": 1719
        },
        {
            "id": 3344,
            "rarity": 90,
            "type": "unknown",
            "ranking": 1720
        },
        {
            "id": 3427,
            "rarity": 90,
            "type": "brownTreeFrog",
            "ranking": 1721
        },
        {
            "id": 3433,
            "rarity": 90,
            "type": "tomatoFrog",
            "ranking": 1722
        },
        {
            "id": 3520,
            "rarity": 90,
            "type": "treeFrog(7)",
            "ranking": 1723
        },
        {
            "id": 3562,
            "rarity": 90,
            "type": "treeFrog(5)",
            "ranking": 1724
        },
        {
            "id": 3619,
            "rarity": 90,
            "type": "treeFrog(6)",
            "ranking": 1725
        },
        {
            "id": 3643,
            "rarity": 90,
            "type": "treeFrog(6)",
            "ranking": 1726
        },
        {
            "id": 3698,
            "rarity": 90,
            "type": "treeFrog(6)",
            "ranking": 1727
        },
        {
            "id": 3718,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1728
        },
        {
            "id": 3784,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1729
        },
        {
            "id": 3824,
            "rarity": 90,
            "type": "treeFrog(4)",
            "ranking": 1730
        },
        {
            "id": 3841,
            "rarity": 90,
            "type": "blueTreeFrog",
            "ranking": 1731
        },
        {
            "id": 3862,
            "rarity": 90,
            "type": "treeFrog(2)",
            "ranking": 1732
        },
        {
            "id": 195,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1733
        },
        {
            "id": 225,
            "rarity": 89,
            "type": "treeFrog(7)",
            "ranking": 1734
        },
        {
            "id": 272,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1735
        },
        {
            "id": 275,
            "rarity": 89,
            "type": "treeFrog(7)",
            "ranking": 1736
        },
        {
            "id": 281,
            "rarity": 89,
            "type": "treeFrog(3)",
            "ranking": 1737
        },
        {
            "id": 392,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1738
        },
        {
            "id": 423,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1739
        },
        {
            "id": 508,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1740
        },
        {
            "id": 577,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1741
        },
        {
            "id": 596,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1742
        },
        {
            "id": 674,
            "rarity": 89,
            "type": "grayTreeFrog",
            "ranking": 1743
        },
        {
            "id": 726,
            "rarity": 89,
            "type": "goldenDartFrog",
            "ranking": 1744
        },
        {
            "id": 735,
            "rarity": 89,
            "type": "treeFrog(6)",
            "ranking": 1745
        },
        {
            "id": 745,
            "rarity": 89,
            "type": "orangeTreeFrog",
            "ranking": 1746
        },
        {
            "id": 746,
            "rarity": 89,
            "type": "treeFrog(7)",
            "ranking": 1747
        },
        {
            "id": 791,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1748
        },
        {
            "id": 838,
            "rarity": 89,
            "type": "cyanTreeFrog",
            "ranking": 1749
        },
        {
            "id": 849,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1750
        },
        {
            "id": 864,
            "rarity": 89,
            "type": "blueDartFrog",
            "ranking": 1751
        },
        {
            "id": 939,
            "rarity": 89,
            "type": "treeFrog(3)",
            "ranking": 1752
        },
        {
            "id": 940,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1753
        },
        {
            "id": 978,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1754
        },
        {
            "id": 1007,
            "rarity": 89,
            "type": "pinkTreeFrog",
            "ranking": 1755
        },
        {
            "id": 1010,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1756
        },
        {
            "id": 1047,
            "rarity": 89,
            "type": "treeFrog(8)",
            "ranking": 1757
        },
        {
            "id": 1053,
            "rarity": 89,
            "type": "brownTreeFrog",
            "ranking": 1758
        },
        {
            "id": 1076,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1759
        },
        {
            "id": 1103,
            "rarity": 89,
            "type": "treeFrog(6)",
            "ranking": 1760
        },
        {
            "id": 1141,
            "rarity": 89,
            "type": "treeFrog(6)",
            "ranking": 1761
        },
        {
            "id": 1299,
            "rarity": 89,
            "type": "lightBrownTreeFrog",
            "ranking": 1762
        },
        {
            "id": 1303,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1763
        },
        {
            "id": 1441,
            "rarity": 89,
            "type": "pinkTreeFrog",
            "ranking": 1764
        },
        {
            "id": 1507,
            "rarity": 89,
            "type": "treeFrog(8)",
            "ranking": 1765
        },
        {
            "id": 1528,
            "rarity": 89,
            "type": "pinkTreeFrog",
            "ranking": 1766
        },
        {
            "id": 1543,
            "rarity": 89,
            "type": "treeFrog(8)",
            "ranking": 1767
        },
        {
            "id": 1549,
            "rarity": 89,
            "type": "treeFrog(6)",
            "ranking": 1768
        },
        {
            "id": 1572,
            "rarity": 89,
            "type": "pinkTreeFrog",
            "ranking": 1769
        },
        {
            "id": 1601,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1770
        },
        {
            "id": 1615,
            "rarity": 89,
            "type": "stawberryDartFrog",
            "ranking": 1771
        },
        {
            "id": 1656,
            "rarity": 89,
            "type": "tomatoFrog",
            "ranking": 1772
        },
        {
            "id": 1657,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1773
        },
        {
            "id": 1667,
            "rarity": 89,
            "type": "cyanTreeFrog",
            "ranking": 1774
        },
        {
            "id": 1729,
            "rarity": 89,
            "type": "redEyedTreeFrog",
            "ranking": 1775
        },
        {
            "id": 1735,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1776
        },
        {
            "id": 1847,
            "rarity": 89,
            "type": "treeFrog(8)",
            "ranking": 1777
        },
        {
            "id": 1883,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1778
        },
        {
            "id": 1888,
            "rarity": 89,
            "type": "goldenDartFrog",
            "ranking": 1779
        },
        {
            "id": 1903,
            "rarity": 89,
            "type": "stawberryDartFrog",
            "ranking": 1780
        },
        {
            "id": 1920,
            "rarity": 89,
            "type": "brownTreeFrog",
            "ranking": 1781
        },
        {
            "id": 1947,
            "rarity": 89,
            "type": "greenTreeFrog",
            "ranking": 1782
        },
        {
            "id": 1971,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1783
        },
        {
            "id": 2001,
            "rarity": 89,
            "type": "pinkTreeFrog",
            "ranking": 1784
        },
        {
            "id": 2145,
            "rarity": 89,
            "type": "blueDartFrog",
            "ranking": 1785
        },
        {
            "id": 2154,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1786
        },
        {
            "id": 2171,
            "rarity": 89,
            "type": "treeFrog(7)",
            "ranking": 1787
        },
        {
            "id": 2193,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1788
        },
        {
            "id": 2200,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1789
        },
        {
            "id": 2203,
            "rarity": 89,
            "type": "orangeTreeFrog",
            "ranking": 1790
        },
        {
            "id": 2305,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1791
        },
        {
            "id": 2319,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1792
        },
        {
            "id": 2362,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1793
        },
        {
            "id": 2380,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1794
        },
        {
            "id": 2422,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1795
        },
        {
            "id": 2441,
            "rarity": 89,
            "type": "treeFrog(6)",
            "ranking": 1796
        },
        {
            "id": 2511,
            "rarity": 89,
            "type": "lightBrownTreeFrog",
            "ranking": 1797
        },
        {
            "id": 2544,
            "rarity": 89,
            "type": "treeFrog(7)",
            "ranking": 1798
        },
        {
            "id": 2559,
            "rarity": 89,
            "type": "blueDartFrog",
            "ranking": 1799
        },
        {
            "id": 2578,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1800
        },
        {
            "id": 2616,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1801
        },
        {
            "id": 2680,
            "rarity": 89,
            "type": "tomatoFrog",
            "ranking": 1802
        },
        {
            "id": 2690,
            "rarity": 89,
            "type": "treeFrog(3)",
            "ranking": 1803
        },
        {
            "id": 2708,
            "rarity": 89,
            "type": "treeFrog(6)",
            "ranking": 1804
        },
        {
            "id": 2734,
            "rarity": 89,
            "type": "treeFrog(8)",
            "ranking": 1805
        },
        {
            "id": 2757,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1806
        },
        {
            "id": 2765,
            "rarity": 89,
            "type": "tomatoFrog",
            "ranking": 1807
        },
        {
            "id": 2822,
            "rarity": 89,
            "type": "goldenDartFrog",
            "ranking": 1808
        },
        {
            "id": 2826,
            "rarity": 89,
            "type": "treeFrog(3)",
            "ranking": 1809
        },
        {
            "id": 2880,
            "rarity": 89,
            "type": "redEyedTreeFrog",
            "ranking": 1810
        },
        {
            "id": 2975,
            "rarity": 89,
            "type": "tomatoFrog",
            "ranking": 1811
        },
        {
            "id": 2999,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1812
        },
        {
            "id": 3021,
            "rarity": 89,
            "type": "tomatoFrog",
            "ranking": 1813
        },
        {
            "id": 3037,
            "rarity": 89,
            "type": "treeFrog(7)",
            "ranking": 1814
        },
        {
            "id": 3039,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1815
        },
        {
            "id": 3120,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1816
        },
        {
            "id": 3214,
            "rarity": 89,
            "type": "treeFrog(7)",
            "ranking": 1817
        },
        {
            "id": 3224,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1818
        },
        {
            "id": 3292,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1819
        },
        {
            "id": 3326,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1820
        },
        {
            "id": 3335,
            "rarity": 89,
            "type": "goldenDartFrog",
            "ranking": 1821
        },
        {
            "id": 3431,
            "rarity": 89,
            "type": "treeFrog(8)",
            "ranking": 1822
        },
        {
            "id": 3480,
            "rarity": 89,
            "type": "treeFrog(6)",
            "ranking": 1823
        },
        {
            "id": 3481,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1824
        },
        {
            "id": 3489,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1825
        },
        {
            "id": 3524,
            "rarity": 89,
            "type": "treeFrog(7)",
            "ranking": 1826
        },
        {
            "id": 3680,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1827
        },
        {
            "id": 3689,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1828
        },
        {
            "id": 3802,
            "rarity": 89,
            "type": "pinkTreeFrog",
            "ranking": 1829
        },
        {
            "id": 3826,
            "rarity": 89,
            "type": "lightBrownTreeFrog",
            "ranking": 1830
        },
        {
            "id": 3846,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1831
        },
        {
            "id": 3890,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1832
        },
        {
            "id": 3898,
            "rarity": 89,
            "type": "treeFrog(4)",
            "ranking": 1833
        },
        {
            "id": 3927,
            "rarity": 89,
            "type": "blueDartFrog",
            "ranking": 1834
        },
        {
            "id": 3933,
            "rarity": 89,
            "type": "treeFrog(5)",
            "ranking": 1835
        },
        {
            "id": 3970,
            "rarity": 89,
            "type": "redEyedTreeFrog",
            "ranking": 1836
        },
        {
            "id": 3972,
            "rarity": 89,
            "type": "treeFrog(7)",
            "ranking": 1837
        },
        {
            "id": 8,
            "rarity": 88,
            "type": "treeFrog(8)",
            "ranking": 1838
        },
        {
            "id": 10,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1839
        },
        {
            "id": 103,
            "rarity": 88,
            "type": "goldenDartFrog",
            "ranking": 1840
        },
        {
            "id": 125,
            "rarity": 88,
            "type": "treeFrog(6)",
            "ranking": 1841
        },
        {
            "id": 149,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1842
        },
        {
            "id": 173,
            "rarity": 88,
            "type": "treeFrog(3)",
            "ranking": 1843
        },
        {
            "id": 201,
            "rarity": 88,
            "type": "treeFrog(8)",
            "ranking": 1844
        },
        {
            "id": 218,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1845
        },
        {
            "id": 245,
            "rarity": 88,
            "type": "treeFrog(7)",
            "ranking": 1846
        },
        {
            "id": 248,
            "rarity": 88,
            "type": "pinkTreeFrog",
            "ranking": 1847
        },
        {
            "id": 290,
            "rarity": 88,
            "type": "treeFrog(7)",
            "ranking": 1848
        },
        {
            "id": 428,
            "rarity": 88,
            "type": "treeFrog(4)",
            "ranking": 1849
        },
        {
            "id": 452,
            "rarity": 88,
            "type": "unknown",
            "ranking": 1850
        },
        {
            "id": 506,
            "rarity": 88,
            "type": "stawberryDartFrog",
            "ranking": 1851
        },
        {
            "id": 637,
            "rarity": 88,
            "type": "unknown",
            "ranking": 1852
        },
        {
            "id": 650,
            "rarity": 88,
            "type": "treeFrog(4)",
            "ranking": 1853
        },
        {
            "id": 670,
            "rarity": 88,
            "type": "unknown",
            "ranking": 1854
        },
        {
            "id": 684,
            "rarity": 88,
            "type": "treeFrog(8)",
            "ranking": 1855
        },
        {
            "id": 689,
            "rarity": 88,
            "type": "treeFrog(6)",
            "ranking": 1856
        },
        {
            "id": 742,
            "rarity": 88,
            "type": "lightBrownTreeFrog",
            "ranking": 1857
        },
        {
            "id": 795,
            "rarity": 88,
            "type": "treeFrog(4)",
            "ranking": 1858
        },
        {
            "id": 875,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1859
        },
        {
            "id": 926,
            "rarity": 88,
            "type": "treeFrog(1)",
            "ranking": 1860
        },
        {
            "id": 931,
            "rarity": 88,
            "type": "stawberryDartFrog",
            "ranking": 1861
        },
        {
            "id": 1140,
            "rarity": 88,
            "type": "treeFrog(7)",
            "ranking": 1862
        },
        {
            "id": 1153,
            "rarity": 88,
            "type": "treeFrog(6)",
            "ranking": 1863
        },
        {
            "id": 1154,
            "rarity": 88,
            "type": "orangeTreeFrog",
            "ranking": 1864
        },
        {
            "id": 1193,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1865
        },
        {
            "id": 1269,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1866
        },
        {
            "id": 1352,
            "rarity": 88,
            "type": "pinkTreeFrog",
            "ranking": 1867
        },
        {
            "id": 1376,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1868
        },
        {
            "id": 1378,
            "rarity": 88,
            "type": "blueDartFrog",
            "ranking": 1869
        },
        {
            "id": 1379,
            "rarity": 88,
            "type": "treeFrog(3)",
            "ranking": 1870
        },
        {
            "id": 1552,
            "rarity": 88,
            "type": "tomatoFrog",
            "ranking": 1871
        },
        {
            "id": 1633,
            "rarity": 88,
            "type": "treeFrog(4)",
            "ranking": 1872
        },
        {
            "id": 1651,
            "rarity": 88,
            "type": "treeFrog(6)",
            "ranking": 1873
        },
        {
            "id": 1678,
            "rarity": 88,
            "type": "treeFrog(7)",
            "ranking": 1874
        },
        {
            "id": 1705,
            "rarity": 88,
            "type": "treeFrog(8)",
            "ranking": 1875
        },
        {
            "id": 1765,
            "rarity": 88,
            "type": "cyanTreeFrog",
            "ranking": 1876
        },
        {
            "id": 1768,
            "rarity": 88,
            "type": "treeFrog(6)",
            "ranking": 1877
        },
        {
            "id": 1790,
            "rarity": 88,
            "type": "treeFrog(1)",
            "ranking": 1878
        },
        {
            "id": 1793,
            "rarity": 88,
            "type": "treeFrog(3)",
            "ranking": 1879
        },
        {
            "id": 1851,
            "rarity": 88,
            "type": "tomatoFrog",
            "ranking": 1880
        },
        {
            "id": 1862,
            "rarity": 88,
            "type": "treeFrog(4)",
            "ranking": 1881
        },
        {
            "id": 1876,
            "rarity": 88,
            "type": "stawberryDartFrog",
            "ranking": 1882
        },
        {
            "id": 1881,
            "rarity": 88,
            "type": "closedEyes",
            "ranking": 1883
        },
        {
            "id": 1959,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1884
        },
        {
            "id": 1960,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1885
        },
        {
            "id": 2076,
            "rarity": 88,
            "type": "brownTreeFrog",
            "ranking": 1886
        },
        {
            "id": 2136,
            "rarity": 88,
            "type": "treeFrog(6)",
            "ranking": 1887
        },
        {
            "id": 2163,
            "rarity": 88,
            "type": "treeFrog(6)",
            "ranking": 1888
        },
        {
            "id": 2186,
            "rarity": 88,
            "type": "treeFrog(7)",
            "ranking": 1889
        },
        {
            "id": 2272,
            "rarity": 88,
            "type": "treeFrog(3)",
            "ranking": 1890
        },
        {
            "id": 2330,
            "rarity": 88,
            "type": "blueDartFrog",
            "ranking": 1891
        },
        {
            "id": 2356,
            "rarity": 88,
            "type": "blueTreeFrog",
            "ranking": 1892
        },
        {
            "id": 2361,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1893
        },
        {
            "id": 2445,
            "rarity": 88,
            "type": "treeFrog(1)",
            "ranking": 1894
        },
        {
            "id": 2573,
            "rarity": 88,
            "type": "treeFrog(3)",
            "ranking": 1895
        },
        {
            "id": 2612,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1896
        },
        {
            "id": 2719,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1897
        },
        {
            "id": 2738,
            "rarity": 88,
            "type": "treeFrog(6)",
            "ranking": 1898
        },
        {
            "id": 2762,
            "rarity": 88,
            "type": "treeFrog(4)",
            "ranking": 1899
        },
        {
            "id": 2830,
            "rarity": 88,
            "type": "treeFrog(8)",
            "ranking": 1900
        },
        {
            "id": 2837,
            "rarity": 88,
            "type": "treeFrog(4)",
            "ranking": 1901
        },
        {
            "id": 2864,
            "rarity": 88,
            "type": "brownTreeFrog",
            "ranking": 1902
        },
        {
            "id": 2882,
            "rarity": 88,
            "type": "treeFrog(6)",
            "ranking": 1903
        },
        {
            "id": 2988,
            "rarity": 88,
            "type": "brownTreeFrog",
            "ranking": 1904
        },
        {
            "id": 3082,
            "rarity": 88,
            "type": "treeFrog(6)",
            "ranking": 1905
        },
        {
            "id": 3205,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1906
        },
        {
            "id": 3225,
            "rarity": 88,
            "type": "treeFrog(6)",
            "ranking": 1907
        },
        {
            "id": 3248,
            "rarity": 88,
            "type": "treeFrog(8)",
            "ranking": 1908
        },
        {
            "id": 3338,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1909
        },
        {
            "id": 3341,
            "rarity": 88,
            "type": "tomatoFrog",
            "ranking": 1910
        },
        {
            "id": 3366,
            "rarity": 88,
            "type": "treeFrog(6)",
            "ranking": 1911
        },
        {
            "id": 3441,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1912
        },
        {
            "id": 3471,
            "rarity": 88,
            "type": "orangeTreeFrog",
            "ranking": 1913
        },
        {
            "id": 3479,
            "rarity": 88,
            "type": "treeFrog(7)",
            "ranking": 1914
        },
        {
            "id": 3508,
            "rarity": 88,
            "type": "treeFrog(7)",
            "ranking": 1915
        },
        {
            "id": 3513,
            "rarity": 88,
            "type": "treeFrog(6)",
            "ranking": 1916
        },
        {
            "id": 3549,
            "rarity": 88,
            "type": "goldenDartFrog",
            "ranking": 1917
        },
        {
            "id": 3611,
            "rarity": 88,
            "type": "treeFrog(4)",
            "ranking": 1918
        },
        {
            "id": 3621,
            "rarity": 88,
            "type": "treeFrog(7)",
            "ranking": 1919
        },
        {
            "id": 3675,
            "rarity": 88,
            "type": "pinkTreeFrog",
            "ranking": 1920
        },
        {
            "id": 3795,
            "rarity": 88,
            "type": "treeFrog(8)",
            "ranking": 1921
        },
        {
            "id": 3812,
            "rarity": 88,
            "type": "treeFrog(6)",
            "ranking": 1922
        },
        {
            "id": 3821,
            "rarity": 88,
            "type": "grayTreeFrog",
            "ranking": 1923
        },
        {
            "id": 3830,
            "rarity": 88,
            "type": "treeFrog(7)",
            "ranking": 1924
        },
        {
            "id": 3834,
            "rarity": 88,
            "type": "treeFrog(6)",
            "ranking": 1925
        },
        {
            "id": 3874,
            "rarity": 88,
            "type": "grayTreeFrog",
            "ranking": 1926
        },
        {
            "id": 3909,
            "rarity": 88,
            "type": "treeFrog(8)",
            "ranking": 1927
        },
        {
            "id": 3985,
            "rarity": 88,
            "type": "unknown",
            "ranking": 1928
        },
        {
            "id": 4001,
            "rarity": 88,
            "type": "treeFrog(7)",
            "ranking": 1929
        },
        {
            "id": 4003,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1930
        },
        {
            "id": 4019,
            "rarity": 88,
            "type": "treeFrog(5)",
            "ranking": 1931
        },
        {
            "id": 39,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 1932
        },
        {
            "id": 65,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 1933
        },
        {
            "id": 151,
            "rarity": 87,
            "type": "tomatoFrog",
            "ranking": 1934
        },
        {
            "id": 155,
            "rarity": 87,
            "type": "treeFrog(4)",
            "ranking": 1935
        },
        {
            "id": 212,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 1936
        },
        {
            "id": 222,
            "rarity": 87,
            "type": "treeFrog(8)",
            "ranking": 1937
        },
        {
            "id": 236,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 1938
        },
        {
            "id": 242,
            "rarity": 87,
            "type": "unknown",
            "ranking": 1939
        },
        {
            "id": 244,
            "rarity": 87,
            "type": "treeFrog(8)",
            "ranking": 1940
        },
        {
            "id": 327,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 1941
        },
        {
            "id": 394,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 1942
        },
        {
            "id": 441,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 1943
        },
        {
            "id": 464,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 1944
        },
        {
            "id": 479,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 1945
        },
        {
            "id": 538,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 1946
        },
        {
            "id": 610,
            "rarity": 87,
            "type": "unknown",
            "ranking": 1947
        },
        {
            "id": 621,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 1948
        },
        {
            "id": 647,
            "rarity": 87,
            "type": "pinkTreeFrog",
            "ranking": 1949
        },
        {
            "id": 667,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 1950
        },
        {
            "id": 672,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 1951
        },
        {
            "id": 709,
            "rarity": 87,
            "type": "tomatoFrog",
            "ranking": 1952
        },
        {
            "id": 728,
            "rarity": 87,
            "type": "orangeTreeFrog",
            "ranking": 1953
        },
        {
            "id": 750,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 1954
        },
        {
            "id": 765,
            "rarity": 87,
            "type": "treeFrog(4)",
            "ranking": 1955
        },
        {
            "id": 891,
            "rarity": 87,
            "type": "stawberryDartFrog",
            "ranking": 1956
        },
        {
            "id": 970,
            "rarity": 87,
            "type": "treeFrog(8)",
            "ranking": 1957
        },
        {
            "id": 1108,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 1958
        },
        {
            "id": 1128,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 1959
        },
        {
            "id": 1143,
            "rarity": 87,
            "type": "stawberryDartFrog",
            "ranking": 1960
        },
        {
            "id": 1173,
            "rarity": 87,
            "type": "treeFrog(4)",
            "ranking": 1961
        },
        {
            "id": 1183,
            "rarity": 87,
            "type": "brownTreeFrog",
            "ranking": 1962
        },
        {
            "id": 1319,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 1963
        },
        {
            "id": 1342,
            "rarity": 87,
            "type": "treeFrog(8)",
            "ranking": 1964
        },
        {
            "id": 1541,
            "rarity": 87,
            "type": "treeFrog(8)",
            "ranking": 1965
        },
        {
            "id": 1556,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 1966
        },
        {
            "id": 1584,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 1967
        },
        {
            "id": 1604,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 1968
        },
        {
            "id": 1622,
            "rarity": 87,
            "type": "treeFrog(3)",
            "ranking": 1969
        },
        {
            "id": 1632,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 1970
        },
        {
            "id": 1652,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 1971
        },
        {
            "id": 1671,
            "rarity": 87,
            "type": "treeFrog(8)",
            "ranking": 1972
        },
        {
            "id": 1681,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 1973
        },
        {
            "id": 1740,
            "rarity": 87,
            "type": "treeFrog(8)",
            "ranking": 1974
        },
        {
            "id": 1752,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 1975
        },
        {
            "id": 1753,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 1976
        },
        {
            "id": 1794,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 1977
        },
        {
            "id": 1860,
            "rarity": 87,
            "type": "tomatoFrog",
            "ranking": 1978
        },
        {
            "id": 1877,
            "rarity": 87,
            "type": "grayTreeFrog",
            "ranking": 1979
        },
        {
            "id": 1885,
            "rarity": 87,
            "type": "blueDartFrog",
            "ranking": 1980
        },
        {
            "id": 1914,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 1981
        },
        {
            "id": 1923,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 1982
        },
        {
            "id": 1945,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 1983
        },
        {
            "id": 1990,
            "rarity": 87,
            "type": "tomatoFrog",
            "ranking": 1984
        },
        {
            "id": 1994,
            "rarity": 87,
            "type": "purpleTreeFrog",
            "ranking": 1985
        },
        {
            "id": 2195,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 1986
        },
        {
            "id": 2198,
            "rarity": 87,
            "type": "treeFrog(3)",
            "ranking": 1987
        },
        {
            "id": 2225,
            "rarity": 87,
            "type": "treeFrog(8)",
            "ranking": 1988
        },
        {
            "id": 2265,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 1989
        },
        {
            "id": 2335,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 1990
        },
        {
            "id": 2355,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 1991
        },
        {
            "id": 2375,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 1992
        },
        {
            "id": 2396,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 1993
        },
        {
            "id": 2400,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 1994
        },
        {
            "id": 2451,
            "rarity": 87,
            "type": "blueTreeFrog",
            "ranking": 1995
        },
        {
            "id": 2480,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 1996
        },
        {
            "id": 2487,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 1997
        },
        {
            "id": 2529,
            "rarity": 87,
            "type": "treeFrog(8)",
            "ranking": 1998
        },
        {
            "id": 2547,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 1999
        },
        {
            "id": 2597,
            "rarity": 87,
            "type": "redEyedTreeFrog",
            "ranking": 2000
        },
        {
            "id": 2610,
            "rarity": 87,
            "type": "tomatoFrog",
            "ranking": 2001
        },
        {
            "id": 2622,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 2002
        },
        {
            "id": 2637,
            "rarity": 87,
            "type": "stawberryDartFrog",
            "ranking": 2003
        },
        {
            "id": 2676,
            "rarity": 87,
            "type": "treeFrog(4)",
            "ranking": 2004
        },
        {
            "id": 2697,
            "rarity": 87,
            "type": "blueTreeFrog",
            "ranking": 2005
        },
        {
            "id": 2786,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 2006
        },
        {
            "id": 2803,
            "rarity": 87,
            "type": "unknown",
            "ranking": 2007
        },
        {
            "id": 2810,
            "rarity": 87,
            "type": "treeFrog(4)",
            "ranking": 2008
        },
        {
            "id": 2959,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 2009
        },
        {
            "id": 3019,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 2010
        },
        {
            "id": 3098,
            "rarity": 87,
            "type": "treeFrog(8)",
            "ranking": 2011
        },
        {
            "id": 3183,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 2012
        },
        {
            "id": 3186,
            "rarity": 87,
            "type": "blueDartFrog",
            "ranking": 2013
        },
        {
            "id": 3220,
            "rarity": 87,
            "type": "goldenDartFrog",
            "ranking": 2014
        },
        {
            "id": 3263,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 2015
        },
        {
            "id": 3269,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 2016
        },
        {
            "id": 3302,
            "rarity": 87,
            "type": "grayTreeFrog",
            "ranking": 2017
        },
        {
            "id": 3308,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 2018
        },
        {
            "id": 3334,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 2019
        },
        {
            "id": 3345,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 2020
        },
        {
            "id": 3378,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 2021
        },
        {
            "id": 3383,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 2022
        },
        {
            "id": 3407,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 2023
        },
        {
            "id": 3415,
            "rarity": 87,
            "type": "treeFrog(4)",
            "ranking": 2024
        },
        {
            "id": 3461,
            "rarity": 87,
            "type": "grayTreeFrog",
            "ranking": 2025
        },
        {
            "id": 3462,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 2026
        },
        {
            "id": 3511,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 2027
        },
        {
            "id": 3532,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 2028
        },
        {
            "id": 3538,
            "rarity": 87,
            "type": "grayTreeFrog",
            "ranking": 2029
        },
        {
            "id": 3543,
            "rarity": 87,
            "type": "treeFrog(3)",
            "ranking": 2030
        },
        {
            "id": 3577,
            "rarity": 87,
            "type": "grayTreeFrog",
            "ranking": 2031
        },
        {
            "id": 3634,
            "rarity": 87,
            "type": "treeFrog(7)",
            "ranking": 2032
        },
        {
            "id": 3731,
            "rarity": 87,
            "type": "treeFrog(3)",
            "ranking": 2033
        },
        {
            "id": 3764,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 2034
        },
        {
            "id": 3766,
            "rarity": 87,
            "type": "unknown",
            "ranking": 2035
        },
        {
            "id": 3767,
            "rarity": 87,
            "type": "unknown",
            "ranking": 2036
        },
        {
            "id": 3888,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 2037
        },
        {
            "id": 3936,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 2038
        },
        {
            "id": 3974,
            "rarity": 87,
            "type": "treeFrog(6)",
            "ranking": 2039
        },
        {
            "id": 3983,
            "rarity": 87,
            "type": "grayTreeFrog",
            "ranking": 2040
        },
        {
            "id": 4010,
            "rarity": 87,
            "type": "treeFrog(5)",
            "ranking": 2041
        },
        {
            "id": 4035,
            "rarity": 87,
            "type": "treeFrog(8)",
            "ranking": 2042
        },
        {
            "id": 45,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2043
        },
        {
            "id": 49,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2044
        },
        {
            "id": 82,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2045
        },
        {
            "id": 86,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2046
        },
        {
            "id": 161,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2047
        },
        {
            "id": 164,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2048
        },
        {
            "id": 182,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2049
        },
        {
            "id": 189,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2050
        },
        {
            "id": 217,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2051
        },
        {
            "id": 231,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2052
        },
        {
            "id": 249,
            "rarity": 86,
            "type": "treeFrog(5)",
            "ranking": 2053
        },
        {
            "id": 261,
            "rarity": 86,
            "type": "treeFrog(5)",
            "ranking": 2054
        },
        {
            "id": 311,
            "rarity": 86,
            "type": "goldenDartFrog",
            "ranking": 2055
        },
        {
            "id": 319,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2056
        },
        {
            "id": 411,
            "rarity": 86,
            "type": "treeFrog(5)",
            "ranking": 2057
        },
        {
            "id": 456,
            "rarity": 86,
            "type": "blueTreeFrog",
            "ranking": 2058
        },
        {
            "id": 481,
            "rarity": 86,
            "type": "unknown",
            "ranking": 2059
        },
        {
            "id": 490,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2060
        },
        {
            "id": 552,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2061
        },
        {
            "id": 635,
            "rarity": 86,
            "type": "redEyedTreeFrog",
            "ranking": 2062
        },
        {
            "id": 649,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2063
        },
        {
            "id": 652,
            "rarity": 86,
            "type": "cyanTreeFrog",
            "ranking": 2064
        },
        {
            "id": 721,
            "rarity": 86,
            "type": "treeFrog(4)",
            "ranking": 2065
        },
        {
            "id": 841,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2066
        },
        {
            "id": 845,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2067
        },
        {
            "id": 907,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2068
        },
        {
            "id": 951,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2069
        },
        {
            "id": 952,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2070
        },
        {
            "id": 966,
            "rarity": 86,
            "type": "treeFrog(5)",
            "ranking": 2071
        },
        {
            "id": 987,
            "rarity": 86,
            "type": "treeFrog(5)",
            "ranking": 2072
        },
        {
            "id": 1009,
            "rarity": 86,
            "type": "blueDartFrog",
            "ranking": 2073
        },
        {
            "id": 1044,
            "rarity": 86,
            "type": "greenTreeFrog",
            "ranking": 2074
        },
        {
            "id": 1086,
            "rarity": 86,
            "type": "treeFrog(5)",
            "ranking": 2075
        },
        {
            "id": 1148,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2076
        },
        {
            "id": 1159,
            "rarity": 86,
            "type": "grayTreeFrog",
            "ranking": 2077
        },
        {
            "id": 1333,
            "rarity": 86,
            "type": "unknown",
            "ranking": 2078
        },
        {
            "id": 1351,
            "rarity": 86,
            "type": "stawberryDartFrog",
            "ranking": 2079
        },
        {
            "id": 1489,
            "rarity": 86,
            "type": "greenTreeFrog",
            "ranking": 2080
        },
        {
            "id": 1553,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2081
        },
        {
            "id": 1554,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2082
        },
        {
            "id": 1566,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2083
        },
        {
            "id": 1595,
            "rarity": 86,
            "type": "treeFrog(4)",
            "ranking": 2084
        },
        {
            "id": 1642,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2085
        },
        {
            "id": 1644,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2086
        },
        {
            "id": 1646,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2087
        },
        {
            "id": 1666,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2088
        },
        {
            "id": 1676,
            "rarity": 86,
            "type": "treeFrog(5)",
            "ranking": 2089
        },
        {
            "id": 1767,
            "rarity": 86,
            "type": "greenTreeFrog",
            "ranking": 2090
        },
        {
            "id": 1801,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2091
        },
        {
            "id": 1814,
            "rarity": 86,
            "type": "treeFrog(5)",
            "ranking": 2092
        },
        {
            "id": 1855,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2093
        },
        {
            "id": 1865,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2094
        },
        {
            "id": 1933,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2095
        },
        {
            "id": 1956,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2096
        },
        {
            "id": 1973,
            "rarity": 86,
            "type": "treeFrog(5)",
            "ranking": 2097
        },
        {
            "id": 1996,
            "rarity": 86,
            "type": "redEyedTreeFrog",
            "ranking": 2098
        },
        {
            "id": 2011,
            "rarity": 86,
            "type": "redEyedTreeFrog",
            "ranking": 2099
        },
        {
            "id": 2017,
            "rarity": 86,
            "type": "grayTreeFrog",
            "ranking": 2100
        },
        {
            "id": 2053,
            "rarity": 86,
            "type": "orangeTreeFrog",
            "ranking": 2101
        },
        {
            "id": 2063,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2102
        },
        {
            "id": 2106,
            "rarity": 86,
            "type": "greenTreeFrog",
            "ranking": 2103
        },
        {
            "id": 2119,
            "rarity": 86,
            "type": "treeFrog(5)",
            "ranking": 2104
        },
        {
            "id": 2130,
            "rarity": 86,
            "type": "lightBrownTreeFrog",
            "ranking": 2105
        },
        {
            "id": 2185,
            "rarity": 86,
            "type": "treeFrog(4)",
            "ranking": 2106
        },
        {
            "id": 2191,
            "rarity": 86,
            "type": "treeFrog(3)",
            "ranking": 2107
        },
        {
            "id": 2196,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2108
        },
        {
            "id": 2214,
            "rarity": 86,
            "type": "unknown",
            "ranking": 2109
        },
        {
            "id": 2236,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2110
        },
        {
            "id": 2275,
            "rarity": 86,
            "type": "goldenDartFrog",
            "ranking": 2111
        },
        {
            "id": 2316,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2112
        },
        {
            "id": 2337,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2113
        },
        {
            "id": 2385,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2114
        },
        {
            "id": 2405,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2115
        },
        {
            "id": 2463,
            "rarity": 86,
            "type": "goldenDartFrog",
            "ranking": 2116
        },
        {
            "id": 2475,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2117
        },
        {
            "id": 2482,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2118
        },
        {
            "id": 2528,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2119
        },
        {
            "id": 2589,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2120
        },
        {
            "id": 2663,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2121
        },
        {
            "id": 2665,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2122
        },
        {
            "id": 2728,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2123
        },
        {
            "id": 2730,
            "rarity": 86,
            "type": "treeFrog(3)",
            "ranking": 2124
        },
        {
            "id": 2772,
            "rarity": 86,
            "type": "blueTreeFrog",
            "ranking": 2125
        },
        {
            "id": 2773,
            "rarity": 86,
            "type": "treeFrog(5)",
            "ranking": 2126
        },
        {
            "id": 2849,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2127
        },
        {
            "id": 3011,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2128
        },
        {
            "id": 3012,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2129
        },
        {
            "id": 3060,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2130
        },
        {
            "id": 3121,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2131
        },
        {
            "id": 3140,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2132
        },
        {
            "id": 3142,
            "rarity": 86,
            "type": "treeFrog(5)",
            "ranking": 2133
        },
        {
            "id": 3160,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2134
        },
        {
            "id": 3166,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2135
        },
        {
            "id": 3197,
            "rarity": 86,
            "type": "treeFrog(3)",
            "ranking": 2136
        },
        {
            "id": 3227,
            "rarity": 86,
            "type": "goldenDartFrog",
            "ranking": 2137
        },
        {
            "id": 3281,
            "rarity": 86,
            "type": "brownTreeFrog",
            "ranking": 2138
        },
        {
            "id": 3370,
            "rarity": 86,
            "type": "treeFrog(8)",
            "ranking": 2139
        },
        {
            "id": 3375,
            "rarity": 86,
            "type": "treeFrog(4)",
            "ranking": 2140
        },
        {
            "id": 3379,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2141
        },
        {
            "id": 3435,
            "rarity": 86,
            "type": "blueTreeFrog",
            "ranking": 2142
        },
        {
            "id": 3457,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2143
        },
        {
            "id": 3512,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2144
        },
        {
            "id": 3527,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2145
        },
        {
            "id": 3551,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2146
        },
        {
            "id": 3638,
            "rarity": 86,
            "type": "blueTreeFrog",
            "ranking": 2147
        },
        {
            "id": 3659,
            "rarity": 86,
            "type": "treeFrog(4)",
            "ranking": 2148
        },
        {
            "id": 3737,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2149
        },
        {
            "id": 3746,
            "rarity": 86,
            "type": "redEyedTreeFrog",
            "ranking": 2150
        },
        {
            "id": 3755,
            "rarity": 86,
            "type": "treeFrog(7)",
            "ranking": 2151
        },
        {
            "id": 3844,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2152
        },
        {
            "id": 3859,
            "rarity": 86,
            "type": "blueTreeFrog",
            "ranking": 2153
        },
        {
            "id": 3878,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2154
        },
        {
            "id": 3880,
            "rarity": 86,
            "type": "treeFrog(4)",
            "ranking": 2155
        },
        {
            "id": 3893,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2156
        },
        {
            "id": 4016,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2157
        },
        {
            "id": 4020,
            "rarity": 86,
            "type": "treeFrog(6)",
            "ranking": 2158
        },
        {
            "id": 4023,
            "rarity": 86,
            "type": "treeFrog(5)",
            "ranking": 2159
        },
        {
            "id": 4027,
            "rarity": 86,
            "type": "treeFrog(5)",
            "ranking": 2160
        },
        {
            "id": 4030,
            "rarity": 86,
            "type": "grayTreeFrog",
            "ranking": 2161
        },
        {
            "id": 23,
            "rarity": 85,
            "type": "redEyedTreeFrog",
            "ranking": 2162
        },
        {
            "id": 64,
            "rarity": 85,
            "type": "treeFrog(4)",
            "ranking": 2163
        },
        {
            "id": 107,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2164
        },
        {
            "id": 120,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2165
        },
        {
            "id": 131,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2166
        },
        {
            "id": 191,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2167
        },
        {
            "id": 251,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2168
        },
        {
            "id": 276,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2169
        },
        {
            "id": 314,
            "rarity": 85,
            "type": "cyanTreeFrog",
            "ranking": 2170
        },
        {
            "id": 316,
            "rarity": 85,
            "type": "greenTreeFrog",
            "ranking": 2171
        },
        {
            "id": 357,
            "rarity": 85,
            "type": "redEyedTreeFrog",
            "ranking": 2172
        },
        {
            "id": 370,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2173
        },
        {
            "id": 372,
            "rarity": 85,
            "type": "treeFrog(5)",
            "ranking": 2174
        },
        {
            "id": 400,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2175
        },
        {
            "id": 416,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2176
        },
        {
            "id": 427,
            "rarity": 85,
            "type": "treeFrog(5)",
            "ranking": 2177
        },
        {
            "id": 451,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2178
        },
        {
            "id": 492,
            "rarity": 85,
            "type": "treeFrog(4)",
            "ranking": 2179
        },
        {
            "id": 496,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2180
        },
        {
            "id": 503,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2181
        },
        {
            "id": 524,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2182
        },
        {
            "id": 528,
            "rarity": 85,
            "type": "cyanTreeFrog",
            "ranking": 2183
        },
        {
            "id": 561,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2184
        },
        {
            "id": 567,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2185
        },
        {
            "id": 589,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2186
        },
        {
            "id": 616,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2187
        },
        {
            "id": 673,
            "rarity": 85,
            "type": "brownTreeFrog",
            "ranking": 2188
        },
        {
            "id": 714,
            "rarity": 85,
            "type": "redEyedTreeFrog",
            "ranking": 2189
        },
        {
            "id": 717,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2190
        },
        {
            "id": 723,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2191
        },
        {
            "id": 738,
            "rarity": 85,
            "type": "treeFrog(5)",
            "ranking": 2192
        },
        {
            "id": 751,
            "rarity": 85,
            "type": "lightBrownTreeFrog",
            "ranking": 2193
        },
        {
            "id": 753,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2194
        },
        {
            "id": 761,
            "rarity": 85,
            "type": "redEyedTreeFrog",
            "ranking": 2195
        },
        {
            "id": 817,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2196
        },
        {
            "id": 837,
            "rarity": 85,
            "type": "treeFrog(5)",
            "ranking": 2197
        },
        {
            "id": 863,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2198
        },
        {
            "id": 869,
            "rarity": 85,
            "type": "blueDartFrog",
            "ranking": 2199
        },
        {
            "id": 870,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2200
        },
        {
            "id": 874,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2201
        },
        {
            "id": 881,
            "rarity": 85,
            "type": "treeFrog(5)",
            "ranking": 2202
        },
        {
            "id": 924,
            "rarity": 85,
            "type": "redEyedTreeFrog",
            "ranking": 2203
        },
        {
            "id": 928,
            "rarity": 85,
            "type": "treeFrog(4)",
            "ranking": 2204
        },
        {
            "id": 1020,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2205
        },
        {
            "id": 1070,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2206
        },
        {
            "id": 1137,
            "rarity": 85,
            "type": "tomatoFrog",
            "ranking": 2207
        },
        {
            "id": 1274,
            "rarity": 85,
            "type": "blueTreeFrog",
            "ranking": 2208
        },
        {
            "id": 1302,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2209
        },
        {
            "id": 1334,
            "rarity": 85,
            "type": "treeFrog(4)",
            "ranking": 2210
        },
        {
            "id": 1367,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2211
        },
        {
            "id": 1407,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2212
        },
        {
            "id": 1422,
            "rarity": 85,
            "type": "croaking",
            "ranking": 2213
        },
        {
            "id": 1478,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2214
        },
        {
            "id": 1500,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2215
        },
        {
            "id": 1520,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2216
        },
        {
            "id": 1712,
            "rarity": 85,
            "type": "goldenDartFrog",
            "ranking": 2217
        },
        {
            "id": 1738,
            "rarity": 85,
            "type": "goldenDartFrog",
            "ranking": 2218
        },
        {
            "id": 1745,
            "rarity": 85,
            "type": "treeFrog(5)",
            "ranking": 2219
        },
        {
            "id": 1769,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2220
        },
        {
            "id": 1813,
            "rarity": 85,
            "type": "treeFrog(4)",
            "ranking": 2221
        },
        {
            "id": 1850,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2222
        },
        {
            "id": 1909,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2223
        },
        {
            "id": 1941,
            "rarity": 85,
            "type": "brownTreeFrog",
            "ranking": 2224
        },
        {
            "id": 2109,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2225
        },
        {
            "id": 2129,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2226
        },
        {
            "id": 2174,
            "rarity": 85,
            "type": "unknown",
            "ranking": 2227
        },
        {
            "id": 2210,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2228
        },
        {
            "id": 2280,
            "rarity": 85,
            "type": "goldenDartFrog",
            "ranking": 2229
        },
        {
            "id": 2284,
            "rarity": 85,
            "type": "tomatoFrog",
            "ranking": 2230
        },
        {
            "id": 2343,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2231
        },
        {
            "id": 2594,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2232
        },
        {
            "id": 2649,
            "rarity": 85,
            "type": "treeFrog(5)",
            "ranking": 2233
        },
        {
            "id": 2682,
            "rarity": 85,
            "type": "purpleTreeFrog",
            "ranking": 2234
        },
        {
            "id": 2863,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2235
        },
        {
            "id": 2888,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2236
        },
        {
            "id": 2906,
            "rarity": 85,
            "type": "stawberryDartFrog",
            "ranking": 2237
        },
        {
            "id": 2927,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2238
        },
        {
            "id": 2953,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2239
        },
        {
            "id": 2954,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2240
        },
        {
            "id": 3018,
            "rarity": 85,
            "type": "treeFrog(4)",
            "ranking": 2241
        },
        {
            "id": 3055,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2242
        },
        {
            "id": 3128,
            "rarity": 85,
            "type": "treeFrog(5)",
            "ranking": 2243
        },
        {
            "id": 3161,
            "rarity": 85,
            "type": "cyanTreeFrog",
            "ranking": 2244
        },
        {
            "id": 3167,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2245
        },
        {
            "id": 3182,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2246
        },
        {
            "id": 3289,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2247
        },
        {
            "id": 3298,
            "rarity": 85,
            "type": "treeFrog(5)",
            "ranking": 2248
        },
        {
            "id": 3317,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2249
        },
        {
            "id": 3323,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2250
        },
        {
            "id": 3331,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2251
        },
        {
            "id": 3337,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2252
        },
        {
            "id": 3390,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2253
        },
        {
            "id": 3449,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2254
        },
        {
            "id": 3494,
            "rarity": 85,
            "type": "treeFrog(5)",
            "ranking": 2255
        },
        {
            "id": 3518,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2256
        },
        {
            "id": 3531,
            "rarity": 85,
            "type": "blueTreeFrog",
            "ranking": 2257
        },
        {
            "id": 3542,
            "rarity": 85,
            "type": "blueTreeFrog",
            "ranking": 2258
        },
        {
            "id": 3602,
            "rarity": 85,
            "type": "greenTreeFrog",
            "ranking": 2259
        },
        {
            "id": 3657,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2260
        },
        {
            "id": 3695,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2261
        },
        {
            "id": 3724,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2262
        },
        {
            "id": 3774,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2263
        },
        {
            "id": 3787,
            "rarity": 85,
            "type": "greenTreeFrog",
            "ranking": 2264
        },
        {
            "id": 3798,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2265
        },
        {
            "id": 3811,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2266
        },
        {
            "id": 3813,
            "rarity": 85,
            "type": "treeFrog(6)",
            "ranking": 2267
        },
        {
            "id": 3877,
            "rarity": 85,
            "type": "treeFrog(8)",
            "ranking": 2268
        },
        {
            "id": 4005,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2269
        },
        {
            "id": 4008,
            "rarity": 85,
            "type": "treeFrog(7)",
            "ranking": 2270
        },
        {
            "id": 4037,
            "rarity": 85,
            "type": "treeFrog(5)",
            "ranking": 2271
        },
        {
            "id": 44,
            "rarity": 84,
            "type": "lightBrownTreeFrog",
            "ranking": 2272
        },
        {
            "id": 113,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2273
        },
        {
            "id": 165,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2274
        },
        {
            "id": 167,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2275
        },
        {
            "id": 188,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2276
        },
        {
            "id": 377,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2277
        },
        {
            "id": 378,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2278
        },
        {
            "id": 385,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2279
        },
        {
            "id": 410,
            "rarity": 84,
            "type": "brownTreeFrog",
            "ranking": 2280
        },
        {
            "id": 426,
            "rarity": 84,
            "type": "treeFrog(4)",
            "ranking": 2281
        },
        {
            "id": 457,
            "rarity": 84,
            "type": "treeFrog(5)",
            "ranking": 2282
        },
        {
            "id": 507,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2283
        },
        {
            "id": 525,
            "rarity": 84,
            "type": "unknown",
            "ranking": 2284
        },
        {
            "id": 530,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2285
        },
        {
            "id": 580,
            "rarity": 84,
            "type": "cyanTreeFrog",
            "ranking": 2286
        },
        {
            "id": 627,
            "rarity": 84,
            "type": "treeFrog(4)",
            "ranking": 2287
        },
        {
            "id": 640,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2288
        },
        {
            "id": 715,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2289
        },
        {
            "id": 775,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2290
        },
        {
            "id": 799,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2291
        },
        {
            "id": 847,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2292
        },
        {
            "id": 872,
            "rarity": 84,
            "type": "treeFrog(4)",
            "ranking": 2293
        },
        {
            "id": 892,
            "rarity": 84,
            "type": "treeFrog(5)",
            "ranking": 2294
        },
        {
            "id": 895,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2295
        },
        {
            "id": 982,
            "rarity": 84,
            "type": "treeFrog(5)",
            "ranking": 2296
        },
        {
            "id": 1019,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2297
        },
        {
            "id": 1028,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2298
        },
        {
            "id": 1035,
            "rarity": 84,
            "type": "blueTreeFrog",
            "ranking": 2299
        },
        {
            "id": 1046,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2300
        },
        {
            "id": 1314,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2301
        },
        {
            "id": 1323,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2302
        },
        {
            "id": 1354,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2303
        },
        {
            "id": 1472,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2304
        },
        {
            "id": 1491,
            "rarity": 84,
            "type": "pinkTreeFrog",
            "ranking": 2305
        },
        {
            "id": 1574,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2306
        },
        {
            "id": 1600,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2307
        },
        {
            "id": 1654,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2308
        },
        {
            "id": 1732,
            "rarity": 84,
            "type": "treeFrog(4)",
            "ranking": 2309
        },
        {
            "id": 1759,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2310
        },
        {
            "id": 1905,
            "rarity": 84,
            "type": "goldenDartFrog",
            "ranking": 2311
        },
        {
            "id": 1936,
            "rarity": 84,
            "type": "treeFrog(5)",
            "ranking": 2312
        },
        {
            "id": 1938,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2313
        },
        {
            "id": 2034,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2314
        },
        {
            "id": 2042,
            "rarity": 84,
            "type": "blueTreeFrog",
            "ranking": 2315
        },
        {
            "id": 2052,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2316
        },
        {
            "id": 2059,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2317
        },
        {
            "id": 2104,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2318
        },
        {
            "id": 2142,
            "rarity": 84,
            "type": "stawberryDartFrog",
            "ranking": 2319
        },
        {
            "id": 2157,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2320
        },
        {
            "id": 2183,
            "rarity": 84,
            "type": "cyanTreeFrog",
            "ranking": 2321
        },
        {
            "id": 2237,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2322
        },
        {
            "id": 2245,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2323
        },
        {
            "id": 2271,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2324
        },
        {
            "id": 2289,
            "rarity": 84,
            "type": "blueTreeFrog",
            "ranking": 2325
        },
        {
            "id": 2313,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2326
        },
        {
            "id": 2321,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2327
        },
        {
            "id": 2327,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2328
        },
        {
            "id": 2351,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2329
        },
        {
            "id": 2428,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2330
        },
        {
            "id": 2466,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2331
        },
        {
            "id": 2472,
            "rarity": 84,
            "type": "redEyedTreeFrog",
            "ranking": 2332
        },
        {
            "id": 2491,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2333
        },
        {
            "id": 2595,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2334
        },
        {
            "id": 2596,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2335
        },
        {
            "id": 2630,
            "rarity": 84,
            "type": "treeFrog(4)",
            "ranking": 2336
        },
        {
            "id": 2648,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2337
        },
        {
            "id": 2659,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2338
        },
        {
            "id": 2677,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2339
        },
        {
            "id": 2698,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2340
        },
        {
            "id": 2896,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2341
        },
        {
            "id": 2902,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2342
        },
        {
            "id": 3020,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2343
        },
        {
            "id": 3029,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2344
        },
        {
            "id": 3048,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2345
        },
        {
            "id": 3066,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2346
        },
        {
            "id": 3067,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2347
        },
        {
            "id": 3069,
            "rarity": 84,
            "type": "unknown",
            "ranking": 2348
        },
        {
            "id": 3086,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2349
        },
        {
            "id": 3150,
            "rarity": 84,
            "type": "orangeTreeFrog",
            "ranking": 2350
        },
        {
            "id": 3155,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2351
        },
        {
            "id": 3158,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2352
        },
        {
            "id": 3176,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2353
        },
        {
            "id": 3252,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2354
        },
        {
            "id": 3299,
            "rarity": 84,
            "type": "lightBrownTreeFrog",
            "ranking": 2355
        },
        {
            "id": 3313,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2356
        },
        {
            "id": 3381,
            "rarity": 84,
            "type": "stawberryDartFrog",
            "ranking": 2357
        },
        {
            "id": 3399,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2358
        },
        {
            "id": 3430,
            "rarity": 84,
            "type": "cyanTreeFrog",
            "ranking": 2359
        },
        {
            "id": 3463,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2360
        },
        {
            "id": 3464,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2361
        },
        {
            "id": 3529,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2362
        },
        {
            "id": 3530,
            "rarity": 84,
            "type": "treeFrog(4)",
            "ranking": 2363
        },
        {
            "id": 3553,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2364
        },
        {
            "id": 3569,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2365
        },
        {
            "id": 3586,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2366
        },
        {
            "id": 3616,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2367
        },
        {
            "id": 3630,
            "rarity": 84,
            "type": "blueDartFrog",
            "ranking": 2368
        },
        {
            "id": 3631,
            "rarity": 84,
            "type": "lightBrownTreeFrog",
            "ranking": 2369
        },
        {
            "id": 3651,
            "rarity": 84,
            "type": "blueTreeFrog",
            "ranking": 2370
        },
        {
            "id": 3742,
            "rarity": 84,
            "type": "treeFrog(5)",
            "ranking": 2371
        },
        {
            "id": 3761,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2372
        },
        {
            "id": 3816,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2373
        },
        {
            "id": 3854,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2374
        },
        {
            "id": 3943,
            "rarity": 84,
            "type": "pinkTreeFrog",
            "ranking": 2375
        },
        {
            "id": 4022,
            "rarity": 84,
            "type": "treeFrog(7)",
            "ranking": 2376
        },
        {
            "id": 4038,
            "rarity": 84,
            "type": "treeFrog(6)",
            "ranking": 2377
        },
        {
            "id": 4040,
            "rarity": 84,
            "type": "treeFrog(8)",
            "ranking": 2378
        },
        {
            "id": 30,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2379
        },
        {
            "id": 35,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2380
        },
        {
            "id": 77,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2381
        },
        {
            "id": 89,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2382
        },
        {
            "id": 169,
            "rarity": 83,
            "type": "treeFrog(5)",
            "ranking": 2383
        },
        {
            "id": 180,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2384
        },
        {
            "id": 192,
            "rarity": 83,
            "type": "treeFrog(4)",
            "ranking": 2385
        },
        {
            "id": 228,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2386
        },
        {
            "id": 274,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2387
        },
        {
            "id": 386,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2388
        },
        {
            "id": 389,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2389
        },
        {
            "id": 391,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2390
        },
        {
            "id": 467,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2391
        },
        {
            "id": 468,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2392
        },
        {
            "id": 535,
            "rarity": 83,
            "type": "blueDartFrog",
            "ranking": 2393
        },
        {
            "id": 557,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2394
        },
        {
            "id": 565,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2395
        },
        {
            "id": 585,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2396
        },
        {
            "id": 620,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2397
        },
        {
            "id": 705,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2398
        },
        {
            "id": 729,
            "rarity": 83,
            "type": "brownTreeFrog",
            "ranking": 2399
        },
        {
            "id": 733,
            "rarity": 83,
            "type": "greenTreeFrog",
            "ranking": 2400
        },
        {
            "id": 853,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2401
        },
        {
            "id": 930,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2402
        },
        {
            "id": 1122,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2403
        },
        {
            "id": 1145,
            "rarity": 83,
            "type": "treeFrog(5)",
            "ranking": 2404
        },
        {
            "id": 1157,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2405
        },
        {
            "id": 1229,
            "rarity": 83,
            "type": "cyanTreeFrog",
            "ranking": 2406
        },
        {
            "id": 1294,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2407
        },
        {
            "id": 1313,
            "rarity": 83,
            "type": "tomatoFrog",
            "ranking": 2408
        },
        {
            "id": 1321,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2409
        },
        {
            "id": 1370,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2410
        },
        {
            "id": 1377,
            "rarity": 83,
            "type": "lightBrownTreeFrog",
            "ranking": 2411
        },
        {
            "id": 1428,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2412
        },
        {
            "id": 1481,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2413
        },
        {
            "id": 1499,
            "rarity": 83,
            "type": "treeFrog(5)",
            "ranking": 2414
        },
        {
            "id": 1517,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2415
        },
        {
            "id": 1533,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2416
        },
        {
            "id": 1568,
            "rarity": 83,
            "type": "lightBrownTreeFrog",
            "ranking": 2417
        },
        {
            "id": 1630,
            "rarity": 83,
            "type": "treeFrog(5)",
            "ranking": 2418
        },
        {
            "id": 1665,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2419
        },
        {
            "id": 1702,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2420
        },
        {
            "id": 1704,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2421
        },
        {
            "id": 1734,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2422
        },
        {
            "id": 1770,
            "rarity": 83,
            "type": "brownTreeFrog",
            "ranking": 2423
        },
        {
            "id": 1832,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2424
        },
        {
            "id": 1910,
            "rarity": 83,
            "type": "treeFrog(5)",
            "ranking": 2425
        },
        {
            "id": 1916,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2426
        },
        {
            "id": 1932,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2427
        },
        {
            "id": 1966,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2428
        },
        {
            "id": 1989,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2429
        },
        {
            "id": 2069,
            "rarity": 83,
            "type": "stawberryDartFrog",
            "ranking": 2430
        },
        {
            "id": 2096,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2431
        },
        {
            "id": 2105,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2432
        },
        {
            "id": 2175,
            "rarity": 83,
            "type": "blueDartFrog",
            "ranking": 2433
        },
        {
            "id": 2181,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2434
        },
        {
            "id": 2184,
            "rarity": 83,
            "type": "tomatoFrog",
            "ranking": 2435
        },
        {
            "id": 2188,
            "rarity": 83,
            "type": "cyanTreeFrog",
            "ranking": 2436
        },
        {
            "id": 2202,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2437
        },
        {
            "id": 2206,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2438
        },
        {
            "id": 2222,
            "rarity": 83,
            "type": "redEyedTreeFrog",
            "ranking": 2439
        },
        {
            "id": 2268,
            "rarity": 83,
            "type": "cyanTreeFrog",
            "ranking": 2440
        },
        {
            "id": 2295,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2441
        },
        {
            "id": 2420,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2442
        },
        {
            "id": 2496,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2443
        },
        {
            "id": 2584,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2444
        },
        {
            "id": 2600,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2445
        },
        {
            "id": 2601,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2446
        },
        {
            "id": 2699,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2447
        },
        {
            "id": 2755,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2448
        },
        {
            "id": 2792,
            "rarity": 83,
            "type": "cyanTreeFrog",
            "ranking": 2449
        },
        {
            "id": 2805,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2450
        },
        {
            "id": 2813,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2451
        },
        {
            "id": 2939,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2452
        },
        {
            "id": 2943,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2453
        },
        {
            "id": 2996,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2454
        },
        {
            "id": 3044,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2455
        },
        {
            "id": 3062,
            "rarity": 83,
            "type": "blueDartFrog",
            "ranking": 2456
        },
        {
            "id": 3073,
            "rarity": 83,
            "type": "cyanTreeFrog",
            "ranking": 2457
        },
        {
            "id": 3134,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2458
        },
        {
            "id": 3170,
            "rarity": 83,
            "type": "grayTreeFrog",
            "ranking": 2459
        },
        {
            "id": 3266,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2460
        },
        {
            "id": 3309,
            "rarity": 83,
            "type": "brownTreeFrog",
            "ranking": 2461
        },
        {
            "id": 3343,
            "rarity": 83,
            "type": "blueTreeFrog",
            "ranking": 2462
        },
        {
            "id": 3351,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2463
        },
        {
            "id": 3361,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2464
        },
        {
            "id": 3372,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2465
        },
        {
            "id": 3373,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2466
        },
        {
            "id": 3405,
            "rarity": 83,
            "type": "greenTreeFrog",
            "ranking": 2467
        },
        {
            "id": 3410,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2468
        },
        {
            "id": 3486,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2469
        },
        {
            "id": 3541,
            "rarity": 83,
            "type": "unknown",
            "ranking": 2470
        },
        {
            "id": 3555,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2471
        },
        {
            "id": 3625,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2472
        },
        {
            "id": 3636,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2473
        },
        {
            "id": 3658,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2474
        },
        {
            "id": 3674,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2475
        },
        {
            "id": 3676,
            "rarity": 83,
            "type": "orangeTreeFrog",
            "ranking": 2476
        },
        {
            "id": 3683,
            "rarity": 83,
            "type": "treeFrog(5)",
            "ranking": 2477
        },
        {
            "id": 3715,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2478
        },
        {
            "id": 3716,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2479
        },
        {
            "id": 3800,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2480
        },
        {
            "id": 3833,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2481
        },
        {
            "id": 3842,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2482
        },
        {
            "id": 3855,
            "rarity": 83,
            "type": "orangeTreeFrog",
            "ranking": 2483
        },
        {
            "id": 3887,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2484
        },
        {
            "id": 3899,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2485
        },
        {
            "id": 3906,
            "rarity": 83,
            "type": "treeFrog(4)",
            "ranking": 2486
        },
        {
            "id": 3977,
            "rarity": 83,
            "type": "treeFrog(8)",
            "ranking": 2487
        },
        {
            "id": 4012,
            "rarity": 83,
            "type": "treeFrog(7)",
            "ranking": 2488
        },
        {
            "id": 4014,
            "rarity": 83,
            "type": "treeFrog(6)",
            "ranking": 2489
        },
        {
            "id": 92,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2490
        },
        {
            "id": 96,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2491
        },
        {
            "id": 117,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2492
        },
        {
            "id": 295,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2493
        },
        {
            "id": 326,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2494
        },
        {
            "id": 439,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2495
        },
        {
            "id": 480,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2496
        },
        {
            "id": 513,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2497
        },
        {
            "id": 540,
            "rarity": 82,
            "type": "brownTreeFrog",
            "ranking": 2498
        },
        {
            "id": 566,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2499
        },
        {
            "id": 569,
            "rarity": 82,
            "type": "brownTreeFrog",
            "ranking": 2500
        },
        {
            "id": 579,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2501
        },
        {
            "id": 594,
            "rarity": 82,
            "type": "brownTreeFrog",
            "ranking": 2502
        },
        {
            "id": 625,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2503
        },
        {
            "id": 636,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2504
        },
        {
            "id": 712,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2505
        },
        {
            "id": 776,
            "rarity": 82,
            "type": "treeFrog(5)",
            "ranking": 2506
        },
        {
            "id": 876,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2507
        },
        {
            "id": 877,
            "rarity": 82,
            "type": "cyanTreeFrog",
            "ranking": 2508
        },
        {
            "id": 883,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2509
        },
        {
            "id": 899,
            "rarity": 82,
            "type": "redEyedTreeFrog",
            "ranking": 2510
        },
        {
            "id": 916,
            "rarity": 82,
            "type": "lightBrownTreeFrog",
            "ranking": 2511
        },
        {
            "id": 967,
            "rarity": 82,
            "type": "treeFrog(5)",
            "ranking": 2512
        },
        {
            "id": 973,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2513
        },
        {
            "id": 1043,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2514
        },
        {
            "id": 1073,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2515
        },
        {
            "id": 1074,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2516
        },
        {
            "id": 1080,
            "rarity": 82,
            "type": "blueDartFrog",
            "ranking": 2517
        },
        {
            "id": 1111,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2518
        },
        {
            "id": 1119,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2519
        },
        {
            "id": 1165,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2520
        },
        {
            "id": 1191,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2521
        },
        {
            "id": 1196,
            "rarity": 82,
            "type": "stawberryDartFrog",
            "ranking": 2522
        },
        {
            "id": 1371,
            "rarity": 82,
            "type": "lightBrownTreeFrog",
            "ranking": 2523
        },
        {
            "id": 1383,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2524
        },
        {
            "id": 1386,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2525
        },
        {
            "id": 1396,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2526
        },
        {
            "id": 1426,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2527
        },
        {
            "id": 1435,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2528
        },
        {
            "id": 1437,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2529
        },
        {
            "id": 1522,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2530
        },
        {
            "id": 1525,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2531
        },
        {
            "id": 1536,
            "rarity": 82,
            "type": "lightBrownTreeFrog",
            "ranking": 2532
        },
        {
            "id": 1625,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2533
        },
        {
            "id": 1711,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2534
        },
        {
            "id": 1750,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2535
        },
        {
            "id": 1804,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2536
        },
        {
            "id": 1852,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2537
        },
        {
            "id": 1899,
            "rarity": 82,
            "type": "grayTreeFrog",
            "ranking": 2538
        },
        {
            "id": 1907,
            "rarity": 82,
            "type": "stawberryDartFrog",
            "ranking": 2539
        },
        {
            "id": 1908,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2540
        },
        {
            "id": 1915,
            "rarity": 82,
            "type": "treeFrog(5)",
            "ranking": 2541
        },
        {
            "id": 1929,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2542
        },
        {
            "id": 1951,
            "rarity": 82,
            "type": "brownTreeFrog",
            "ranking": 2543
        },
        {
            "id": 1984,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2544
        },
        {
            "id": 2000,
            "rarity": 82,
            "type": "stawberryDartFrog",
            "ranking": 2545
        },
        {
            "id": 2047,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2546
        },
        {
            "id": 2114,
            "rarity": 82,
            "type": "treeFrog(5)",
            "ranking": 2547
        },
        {
            "id": 2220,
            "rarity": 82,
            "type": "brownTreeFrog",
            "ranking": 2548
        },
        {
            "id": 2248,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2549
        },
        {
            "id": 2257,
            "rarity": 82,
            "type": "tomatoFrog",
            "ranking": 2550
        },
        {
            "id": 2286,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2551
        },
        {
            "id": 2304,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2552
        },
        {
            "id": 2308,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2553
        },
        {
            "id": 2371,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2554
        },
        {
            "id": 2485,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2555
        },
        {
            "id": 2530,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2556
        },
        {
            "id": 2566,
            "rarity": 82,
            "type": "cyanTreeFrog",
            "ranking": 2557
        },
        {
            "id": 2629,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2558
        },
        {
            "id": 2692,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2559
        },
        {
            "id": 2702,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2560
        },
        {
            "id": 2733,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2561
        },
        {
            "id": 2764,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2562
        },
        {
            "id": 2769,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2563
        },
        {
            "id": 2776,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2564
        },
        {
            "id": 2833,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2565
        },
        {
            "id": 2856,
            "rarity": 82,
            "type": "grayTreeFrog",
            "ranking": 2566
        },
        {
            "id": 2963,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2567
        },
        {
            "id": 2989,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2568
        },
        {
            "id": 3010,
            "rarity": 82,
            "type": "blueTreeFrog",
            "ranking": 2569
        },
        {
            "id": 3057,
            "rarity": 82,
            "type": "greenTreeFrog",
            "ranking": 2570
        },
        {
            "id": 3058,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2571
        },
        {
            "id": 3189,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2572
        },
        {
            "id": 3283,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2573
        },
        {
            "id": 3303,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2574
        },
        {
            "id": 3306,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2575
        },
        {
            "id": 3336,
            "rarity": 82,
            "type": "treeFrog(4)",
            "ranking": 2576
        },
        {
            "id": 3352,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2577
        },
        {
            "id": 3406,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2578
        },
        {
            "id": 3535,
            "rarity": 82,
            "type": "treeFrog(5)",
            "ranking": 2579
        },
        {
            "id": 3560,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2580
        },
        {
            "id": 3575,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2581
        },
        {
            "id": 3581,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2582
        },
        {
            "id": 3597,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2583
        },
        {
            "id": 3599,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2584
        },
        {
            "id": 3641,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2585
        },
        {
            "id": 3652,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2586
        },
        {
            "id": 3670,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2587
        },
        {
            "id": 3707,
            "rarity": 82,
            "type": "treeFrog(7)",
            "ranking": 2588
        },
        {
            "id": 3712,
            "rarity": 82,
            "type": "treeFrog(5)",
            "ranking": 2589
        },
        {
            "id": 3725,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2590
        },
        {
            "id": 3745,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2591
        },
        {
            "id": 3809,
            "rarity": 82,
            "type": "treeFrog(5)",
            "ranking": 2592
        },
        {
            "id": 3857,
            "rarity": 82,
            "type": "treeFrog(6)",
            "ranking": 2593
        },
        {
            "id": 4009,
            "rarity": 82,
            "type": "treeFrog(8)",
            "ranking": 2594
        },
        {
            "id": 36,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2595
        },
        {
            "id": 208,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2596
        },
        {
            "id": 246,
            "rarity": 81,
            "type": "brownTreeFrog",
            "ranking": 2597
        },
        {
            "id": 267,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2598
        },
        {
            "id": 430,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2599
        },
        {
            "id": 434,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2600
        },
        {
            "id": 444,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2601
        },
        {
            "id": 477,
            "rarity": 81,
            "type": "brownTreeFrog",
            "ranking": 2602
        },
        {
            "id": 478,
            "rarity": 81,
            "type": "lightBrownTreeFrog",
            "ranking": 2603
        },
        {
            "id": 485,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2604
        },
        {
            "id": 523,
            "rarity": 81,
            "type": "treeFrog(6)",
            "ranking": 2605
        },
        {
            "id": 698,
            "rarity": 81,
            "type": "treeFrog(5)",
            "ranking": 2606
        },
        {
            "id": 703,
            "rarity": 81,
            "type": "lightBrownTreeFrog",
            "ranking": 2607
        },
        {
            "id": 731,
            "rarity": 81,
            "type": "grayTreeFrog",
            "ranking": 2608
        },
        {
            "id": 732,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2609
        },
        {
            "id": 763,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2610
        },
        {
            "id": 804,
            "rarity": 81,
            "type": "goldenDartFrog",
            "ranking": 2611
        },
        {
            "id": 807,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2612
        },
        {
            "id": 915,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2613
        },
        {
            "id": 1136,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2614
        },
        {
            "id": 1222,
            "rarity": 81,
            "type": "stawberryDartFrog",
            "ranking": 2615
        },
        {
            "id": 1247,
            "rarity": 81,
            "type": "unknown",
            "ranking": 2616
        },
        {
            "id": 1349,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2617
        },
        {
            "id": 1375,
            "rarity": 81,
            "type": "brownTreeFrog",
            "ranking": 2618
        },
        {
            "id": 1444,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2619
        },
        {
            "id": 1471,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2620
        },
        {
            "id": 1650,
            "rarity": 81,
            "type": "cyanTreeFrog",
            "ranking": 2621
        },
        {
            "id": 1653,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2622
        },
        {
            "id": 1663,
            "rarity": 81,
            "type": "unknown",
            "ranking": 2623
        },
        {
            "id": 1811,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2624
        },
        {
            "id": 2041,
            "rarity": 81,
            "type": "brownTreeFrog",
            "ranking": 2625
        },
        {
            "id": 2080,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2626
        },
        {
            "id": 2107,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2627
        },
        {
            "id": 2240,
            "rarity": 81,
            "type": "pinkTreeFrog",
            "ranking": 2628
        },
        {
            "id": 2367,
            "rarity": 81,
            "type": "lightBrownTreeFrog",
            "ranking": 2629
        },
        {
            "id": 2379,
            "rarity": 81,
            "type": "treeFrog(6)",
            "ranking": 2630
        },
        {
            "id": 2418,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2631
        },
        {
            "id": 2423,
            "rarity": 81,
            "type": "redEyedTreeFrog",
            "ranking": 2632
        },
        {
            "id": 2498,
            "rarity": 81,
            "type": "treeFrog(6)",
            "ranking": 2633
        },
        {
            "id": 2539,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2634
        },
        {
            "id": 2543,
            "rarity": 81,
            "type": "cyanTreeFrog",
            "ranking": 2635
        },
        {
            "id": 2550,
            "rarity": 81,
            "type": "goldenDartFrog",
            "ranking": 2636
        },
        {
            "id": 2606,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2637
        },
        {
            "id": 2645,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2638
        },
        {
            "id": 2664,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2639
        },
        {
            "id": 2720,
            "rarity": 81,
            "type": "brownTreeFrog",
            "ranking": 2640
        },
        {
            "id": 2742,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2641
        },
        {
            "id": 2782,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2642
        },
        {
            "id": 2877,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2643
        },
        {
            "id": 3049,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2644
        },
        {
            "id": 3089,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2645
        },
        {
            "id": 3149,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2646
        },
        {
            "id": 3211,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2647
        },
        {
            "id": 3212,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2648
        },
        {
            "id": 3385,
            "rarity": 81,
            "type": "cyanTreeFrog",
            "ranking": 2649
        },
        {
            "id": 3429,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2650
        },
        {
            "id": 3566,
            "rarity": 81,
            "type": "treeFrog(8)",
            "ranking": 2651
        },
        {
            "id": 3603,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2652
        },
        {
            "id": 3700,
            "rarity": 81,
            "type": "treeFrog(6)",
            "ranking": 2653
        },
        {
            "id": 3754,
            "rarity": 81,
            "type": "treeFrog(7)",
            "ranking": 2654
        },
        {
            "id": 3879,
            "rarity": 81,
            "type": "redEyedTreeFrog",
            "ranking": 2655
        },
        {
            "id": 3929,
            "rarity": 81,
            "type": "treeFrog(6)",
            "ranking": 2656
        },
        {
            "id": 21,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2657
        },
        {
            "id": 34,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2658
        },
        {
            "id": 71,
            "rarity": 80,
            "type": "tomatoFrog",
            "ranking": 2659
        },
        {
            "id": 178,
            "rarity": 80,
            "type": "treeFrog(6)",
            "ranking": 2660
        },
        {
            "id": 181,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2661
        },
        {
            "id": 193,
            "rarity": 80,
            "type": "treeFrog(6)",
            "ranking": 2662
        },
        {
            "id": 230,
            "rarity": 80,
            "type": "goldenTreeFrog",
            "ranking": 2663
        },
        {
            "id": 302,
            "rarity": 80,
            "type": "goldenTreeFrog",
            "ranking": 2664
        },
        {
            "id": 424,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2665
        },
        {
            "id": 533,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2666
        },
        {
            "id": 537,
            "rarity": 80,
            "type": "tomatoFrog",
            "ranking": 2667
        },
        {
            "id": 562,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2668
        },
        {
            "id": 648,
            "rarity": 80,
            "type": "treeFrog(5)",
            "ranking": 2669
        },
        {
            "id": 769,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2670
        },
        {
            "id": 790,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2671
        },
        {
            "id": 821,
            "rarity": 80,
            "type": "unknown",
            "ranking": 2672
        },
        {
            "id": 858,
            "rarity": 80,
            "type": "grayTreeFrog",
            "ranking": 2673
        },
        {
            "id": 962,
            "rarity": 80,
            "type": "treeFrog(6)",
            "ranking": 2674
        },
        {
            "id": 1006,
            "rarity": 80,
            "type": "redEyedTreeFrog",
            "ranking": 2675
        },
        {
            "id": 1039,
            "rarity": 80,
            "type": "treeFrog(7)",
            "ranking": 2676
        },
        {
            "id": 1096,
            "rarity": 80,
            "type": "treeFrog(5)",
            "ranking": 2677
        },
        {
            "id": 1101,
            "rarity": 80,
            "type": "treeFrog(6)",
            "ranking": 2678
        },
        {
            "id": 1131,
            "rarity": 80,
            "type": "treeFrog(6)",
            "ranking": 2679
        },
        {
            "id": 1135,
            "rarity": 80,
            "type": "treeFrog(7)",
            "ranking": 2680
        },
        {
            "id": 1186,
            "rarity": 80,
            "type": "treeFrog(5)",
            "ranking": 2681
        },
        {
            "id": 1384,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2682
        },
        {
            "id": 1455,
            "rarity": 80,
            "type": "grayTreeFrog",
            "ranking": 2683
        },
        {
            "id": 1621,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2684
        },
        {
            "id": 1628,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2685
        },
        {
            "id": 1841,
            "rarity": 80,
            "type": "treeFrog(7)",
            "ranking": 2686
        },
        {
            "id": 2031,
            "rarity": 80,
            "type": "treeFrog(7)",
            "ranking": 2687
        },
        {
            "id": 2190,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2688
        },
        {
            "id": 2199,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2689
        },
        {
            "id": 2242,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2690
        },
        {
            "id": 2244,
            "rarity": 80,
            "type": "treeFrog(7)",
            "ranking": 2691
        },
        {
            "id": 2288,
            "rarity": 80,
            "type": "grayTreeFrog",
            "ranking": 2692
        },
        {
            "id": 2318,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2693
        },
        {
            "id": 2534,
            "rarity": 80,
            "type": "treeFrog(7)",
            "ranking": 2694
        },
        {
            "id": 2551,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2695
        },
        {
            "id": 2853,
            "rarity": 80,
            "type": "redEyedTreeFrog",
            "ranking": 2696
        },
        {
            "id": 2855,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2697
        },
        {
            "id": 2937,
            "rarity": 80,
            "type": "redEyedTreeFrog",
            "ranking": 2698
        },
        {
            "id": 2940,
            "rarity": 80,
            "type": "treeFrog(6)",
            "ranking": 2699
        },
        {
            "id": 3034,
            "rarity": 80,
            "type": "goldenDartFrog",
            "ranking": 2700
        },
        {
            "id": 3088,
            "rarity": 80,
            "type": "treeFrog(6)",
            "ranking": 2701
        },
        {
            "id": 3187,
            "rarity": 80,
            "type": "treeFrog(5)",
            "ranking": 2702
        },
        {
            "id": 3195,
            "rarity": 80,
            "type": "treeFrog(8)",
            "ranking": 2703
        },
        {
            "id": 3432,
            "rarity": 80,
            "type": "tomatoFrog",
            "ranking": 2704
        },
        {
            "id": 3613,
            "rarity": 80,
            "type": "treeFrog(6)",
            "ranking": 2705
        },
        {
            "id": 3614,
            "rarity": 80,
            "type": "brownTreeFrog",
            "ranking": 2706
        },
        {
            "id": 3807,
            "rarity": 80,
            "type": "brownTreeFrog",
            "ranking": 2707
        },
        {
            "id": 3815,
            "rarity": 80,
            "type": "treeFrog(7)",
            "ranking": 2708
        },
        {
            "id": 3895,
            "rarity": 80,
            "type": "treeFrog(2)",
            "ranking": 2709
        },
        {
            "id": 3940,
            "rarity": 80,
            "type": "treeFrog(7)",
            "ranking": 2710
        },
        {
            "id": 3948,
            "rarity": 80,
            "type": "grayTreeFrog",
            "ranking": 2711
        },
        {
            "id": 3991,
            "rarity": 80,
            "type": "treeFrog(6)",
            "ranking": 2712
        },
        {
            "id": 32,
            "rarity": 79,
            "type": "treeFrog(7)",
            "ranking": 2713
        },
        {
            "id": 42,
            "rarity": 79,
            "type": "treeFrog(8)",
            "ranking": 2714
        },
        {
            "id": 138,
            "rarity": 79,
            "type": "lightBrownTreeFrog",
            "ranking": 2715
        },
        {
            "id": 143,
            "rarity": 79,
            "type": "greenTreeFrog",
            "ranking": 2716
        },
        {
            "id": 145,
            "rarity": 79,
            "type": "greenTreeFrog",
            "ranking": 2717
        },
        {
            "id": 185,
            "rarity": 79,
            "type": "treeFrog(8)",
            "ranking": 2718
        },
        {
            "id": 342,
            "rarity": 79,
            "type": "treeFrog(2)",
            "ranking": 2719
        },
        {
            "id": 354,
            "rarity": 79,
            "type": "goldenTreeFrog",
            "ranking": 2720
        },
        {
            "id": 433,
            "rarity": 79,
            "type": "treeFrog(8)",
            "ranking": 2721
        },
        {
            "id": 619,
            "rarity": 79,
            "type": "treeFrog(7)",
            "ranking": 2722
        },
        {
            "id": 631,
            "rarity": 79,
            "type": "treeFrog(6)",
            "ranking": 2723
        },
        {
            "id": 711,
            "rarity": 79,
            "type": "treeFrog(8)",
            "ranking": 2724
        },
        {
            "id": 830,
            "rarity": 79,
            "type": "treeFrog(6)",
            "ranking": 2725
        },
        {
            "id": 871,
            "rarity": 79,
            "type": "goldenDartFrog",
            "ranking": 2726
        },
        {
            "id": 873,
            "rarity": 79,
            "type": "treeFrog(6)",
            "ranking": 2727
        },
        {
            "id": 885,
            "rarity": 79,
            "type": "treeFrog(8)",
            "ranking": 2728
        },
        {
            "id": 964,
            "rarity": 79,
            "type": "goldenDartFrog",
            "ranking": 2729
        },
        {
            "id": 1219,
            "rarity": 79,
            "type": "redEyedTreeFrog",
            "ranking": 2730
        },
        {
            "id": 1438,
            "rarity": 79,
            "type": "treeFrog(6)",
            "ranking": 2731
        },
        {
            "id": 1505,
            "rarity": 79,
            "type": "treeFrog(7)",
            "ranking": 2732
        },
        {
            "id": 1551,
            "rarity": 79,
            "type": "treeFrog(5)",
            "ranking": 2733
        },
        {
            "id": 1603,
            "rarity": 79,
            "type": "treeFrog(7)",
            "ranking": 2734
        },
        {
            "id": 1701,
            "rarity": 79,
            "type": "treeFrog(8)",
            "ranking": 2735
        },
        {
            "id": 1743,
            "rarity": 79,
            "type": "treeFrog(6)",
            "ranking": 2736
        },
        {
            "id": 1774,
            "rarity": 79,
            "type": "treeFrog(6)",
            "ranking": 2737
        },
        {
            "id": 1873,
            "rarity": 79,
            "type": "treeFrog(6)",
            "ranking": 2738
        },
        {
            "id": 1922,
            "rarity": 79,
            "type": "grayTreeFrog",
            "ranking": 2739
        },
        {
            "id": 1926,
            "rarity": 79,
            "type": "blueTreeFrog",
            "ranking": 2740
        },
        {
            "id": 2123,
            "rarity": 79,
            "type": "treeFrog(6)",
            "ranking": 2741
        },
        {
            "id": 2273,
            "rarity": 79,
            "type": "treeFrog(6)",
            "ranking": 2742
        },
        {
            "id": 2363,
            "rarity": 79,
            "type": "treeFrog(7)",
            "ranking": 2743
        },
        {
            "id": 2383,
            "rarity": 79,
            "type": "treeFrog(7)",
            "ranking": 2744
        },
        {
            "id": 2546,
            "rarity": 79,
            "type": "treeFrog(8)",
            "ranking": 2745
        },
        {
            "id": 2621,
            "rarity": 79,
            "type": "unknown",
            "ranking": 2746
        },
        {
            "id": 2650,
            "rarity": 79,
            "type": "lightBrownTreeFrog",
            "ranking": 2747
        },
        {
            "id": 2704,
            "rarity": 79,
            "type": "treeFrog(7)",
            "ranking": 2748
        },
        {
            "id": 2710,
            "rarity": 79,
            "type": "brownTreeFrog",
            "ranking": 2749
        },
        {
            "id": 2779,
            "rarity": 79,
            "type": "treeFrog(6)",
            "ranking": 2750
        },
        {
            "id": 2799,
            "rarity": 79,
            "type": "treeFrog(6)",
            "ranking": 2751
        },
        {
            "id": 2816,
            "rarity": 79,
            "type": "treeFrog(8)",
            "ranking": 2752
        },
        {
            "id": 2825,
            "rarity": 79,
            "type": "blueTreeFrog",
            "ranking": 2753
        },
        {
            "id": 3031,
            "rarity": 79,
            "type": "treeFrog(8)",
            "ranking": 2754
        },
        {
            "id": 3084,
            "rarity": 79,
            "type": "brownTreeFrog",
            "ranking": 2755
        },
        {
            "id": 3127,
            "rarity": 79,
            "type": "treeFrog(8)",
            "ranking": 2756
        },
        {
            "id": 3202,
            "rarity": 79,
            "type": "goldenTreeFrog",
            "ranking": 2757
        },
        {
            "id": 3231,
            "rarity": 79,
            "type": "goldenTreeFrog",
            "ranking": 2758
        },
        {
            "id": 3424,
            "rarity": 79,
            "type": "treeFrog(6)",
            "ranking": 2759
        },
        {
            "id": 3446,
            "rarity": 79,
            "type": "treeFrog(8)",
            "ranking": 2760
        },
        {
            "id": 3460,
            "rarity": 79,
            "type": "greenTreeFrog",
            "ranking": 2761
        },
        {
            "id": 3468,
            "rarity": 79,
            "type": "treeFrog(7)",
            "ranking": 2762
        },
        {
            "id": 3488,
            "rarity": 79,
            "type": "treeFrog(6)",
            "ranking": 2763
        },
        {
            "id": 3585,
            "rarity": 79,
            "type": "treeFrog(7)",
            "ranking": 2764
        },
        {
            "id": 3605,
            "rarity": 79,
            "type": "unknown",
            "ranking": 2765
        },
        {
            "id": 3662,
            "rarity": 79,
            "type": "blueTreeFrog",
            "ranking": 2766
        },
        {
            "id": 3726,
            "rarity": 79,
            "type": "treeFrog(8)",
            "ranking": 2767
        },
        {
            "id": 3740,
            "rarity": 79,
            "type": "treeFrog(8)",
            "ranking": 2768
        },
        {
            "id": 3796,
            "rarity": 79,
            "type": "cyanTreeFrog",
            "ranking": 2769
        },
        {
            "id": 4033,
            "rarity": 79,
            "type": "treeFrog(8)",
            "ranking": 2770
        },
        {
            "id": 14,
            "rarity": 78,
            "type": "treeFrog(7)",
            "ranking": 2771
        },
        {
            "id": 47,
            "rarity": 78,
            "type": "treeFrog(7)",
            "ranking": 2772
        },
        {
            "id": 81,
            "rarity": 78,
            "type": "treeFrog(8)",
            "ranking": 2773
        },
        {
            "id": 83,
            "rarity": 78,
            "type": "treeFrog(7)",
            "ranking": 2774
        },
        {
            "id": 88,
            "rarity": 78,
            "type": "treeFrog(6)",
            "ranking": 2775
        },
        {
            "id": 216,
            "rarity": 78,
            "type": "treeFrog(8)",
            "ranking": 2776
        },
        {
            "id": 664,
            "rarity": 78,
            "type": "treeFrog(8)",
            "ranking": 2777
        },
        {
            "id": 720,
            "rarity": 78,
            "type": "redEyedTreeFrog",
            "ranking": 2778
        },
        {
            "id": 778,
            "rarity": 78,
            "type": "treeFrog(8)",
            "ranking": 2779
        },
        {
            "id": 894,
            "rarity": 78,
            "type": "goldenTreeFrog",
            "ranking": 2780
        },
        {
            "id": 1071,
            "rarity": 78,
            "type": "treeFrog(7)",
            "ranking": 2781
        },
        {
            "id": 1134,
            "rarity": 78,
            "type": "treeFrog(8)",
            "ranking": 2782
        },
        {
            "id": 1151,
            "rarity": 78,
            "type": "goldenTreeFrog",
            "ranking": 2783
        },
        {
            "id": 1195,
            "rarity": 78,
            "type": "treeFrog(8)",
            "ranking": 2784
        },
        {
            "id": 1293,
            "rarity": 78,
            "type": "unknown",
            "ranking": 2785
        },
        {
            "id": 1339,
            "rarity": 78,
            "type": "treeFrog(8)",
            "ranking": 2786
        },
        {
            "id": 1409,
            "rarity": 78,
            "type": "treeFrog(7)",
            "ranking": 2787
        },
        {
            "id": 1645,
            "rarity": 78,
            "type": "goldenTreeFrog",
            "ranking": 2788
        },
        {
            "id": 1756,
            "rarity": 78,
            "type": "treeFrog(8)",
            "ranking": 2789
        },
        {
            "id": 2166,
            "rarity": 78,
            "type": "treeFrog(7)",
            "ranking": 2790
        },
        {
            "id": 2317,
            "rarity": 78,
            "type": "goldenTreeFrog",
            "ranking": 2791
        },
        {
            "id": 2332,
            "rarity": 78,
            "type": "treeFrog(8)",
            "ranking": 2792
        },
        {
            "id": 2587,
            "rarity": 78,
            "type": "treeFrog(8)",
            "ranking": 2793
        },
        {
            "id": 2668,
            "rarity": 78,
            "type": "treeFrog(8)",
            "ranking": 2794
        },
        {
            "id": 2815,
            "rarity": 78,
            "type": "treeFrog(7)",
            "ranking": 2795
        },
        {
            "id": 2960,
            "rarity": 78,
            "type": "treeFrog(7)",
            "ranking": 2796
        },
        {
            "id": 3056,
            "rarity": 78,
            "type": "treeFrog(8)",
            "ranking": 2797
        },
        {
            "id": 3234,
            "rarity": 78,
            "type": "lightBrownTreeFrog",
            "ranking": 2798
        },
        {
            "id": 3368,
            "rarity": 78,
            "type": "treeFrog(7)",
            "ranking": 2799
        },
        {
            "id": 3442,
            "rarity": 78,
            "type": "treeFrog(7)",
            "ranking": 2800
        },
        {
            "id": 3504,
            "rarity": 78,
            "type": "redEyedTreeFrog",
            "ranking": 2801
        },
        {
            "id": 3584,
            "rarity": 78,
            "type": "treeFrog(8)",
            "ranking": 2802
        },
        {
            "id": 3660,
            "rarity": 78,
            "type": "treeFrog(7)",
            "ranking": 2803
        },
        {
            "id": 3805,
            "rarity": 78,
            "type": "redEyedTreeFrog",
            "ranking": 2804
        },
        {
            "id": 3937,
            "rarity": 78,
            "type": "treeFrog(8)",
            "ranking": 2805
        },
        {
            "id": 3961,
            "rarity": 78,
            "type": "treeFrog(8)",
            "ranking": 2806
        },
        {
            "id": 4025,
            "rarity": 78,
            "type": "treeFrog(8)",
            "ranking": 2807
        },
        {
            "id": 67,
            "rarity": 77,
            "type": "treeFrog(6)",
            "ranking": 2808
        },
        {
            "id": 235,
            "rarity": 77,
            "type": "treeFrog(8)",
            "ranking": 2809
        },
        {
            "id": 371,
            "rarity": 77,
            "type": "lightBrownTreeFrog",
            "ranking": 2810
        },
        {
            "id": 586,
            "rarity": 77,
            "type": "lightBrownTreeFrog",
            "ranking": 2811
        },
        {
            "id": 680,
            "rarity": 77,
            "type": "treeFrog(6)",
            "ranking": 2812
        },
        {
            "id": 890,
            "rarity": 77,
            "type": "treeFrog(8)",
            "ranking": 2813
        },
        {
            "id": 1189,
            "rarity": 77,
            "type": "brownTreeFrog",
            "ranking": 2814
        },
        {
            "id": 1256,
            "rarity": 77,
            "type": "goldenTreeFrog",
            "ranking": 2815
        },
        {
            "id": 1328,
            "rarity": 77,
            "type": "treeFrog(7)",
            "ranking": 2816
        },
        {
            "id": 1335,
            "rarity": 77,
            "type": "splendidLeafFrog",
            "ranking": 2817
        },
        {
            "id": 1458,
            "rarity": 77,
            "type": "goldenTreeFrog",
            "ranking": 2818
        },
        {
            "id": 1744,
            "rarity": 77,
            "type": "treeFrog(6)",
            "ranking": 2819
        },
        {
            "id": 1799,
            "rarity": 77,
            "type": "treeFrog(2)",
            "ranking": 2820
        },
        {
            "id": 1912,
            "rarity": 77,
            "type": "goldenTreeFrog",
            "ranking": 2821
        },
        {
            "id": 2081,
            "rarity": 77,
            "type": "treeFrog(8)",
            "ranking": 2822
        },
        {
            "id": 2425,
            "rarity": 77,
            "type": "treeFrog(6)",
            "ranking": 2823
        },
        {
            "id": 2590,
            "rarity": 77,
            "type": "treeFrog(8)",
            "ranking": 2824
        },
        {
            "id": 2607,
            "rarity": 77,
            "type": "treeFrog(2)",
            "ranking": 2825
        },
        {
            "id": 2641,
            "rarity": 77,
            "type": "splendidLeafFrog",
            "ranking": 2826
        },
        {
            "id": 2732,
            "rarity": 77,
            "type": "treeFrog(7)",
            "ranking": 2827
        },
        {
            "id": 2890,
            "rarity": 77,
            "type": "treeFrog(8)",
            "ranking": 2828
        },
        {
            "id": 2899,
            "rarity": 77,
            "type": "treeFrog(2)",
            "ranking": 2829
        },
        {
            "id": 2920,
            "rarity": 77,
            "type": "treeFrog(8)",
            "ranking": 2830
        },
        {
            "id": 2946,
            "rarity": 77,
            "type": "treeFrog(8)",
            "ranking": 2831
        },
        {
            "id": 3137,
            "rarity": 77,
            "type": "treeFrog(7)",
            "ranking": 2832
        },
        {
            "id": 3185,
            "rarity": 77,
            "type": "cyanTreeFrog",
            "ranking": 2833
        },
        {
            "id": 3348,
            "rarity": 77,
            "type": "cyanTreeFrog",
            "ranking": 2834
        },
        {
            "id": 310,
            "rarity": 76,
            "type": "treeFrog(2)",
            "ranking": 2835
        },
        {
            "id": 406,
            "rarity": 76,
            "type": "treeFrog(7)",
            "ranking": 2836
        },
        {
            "id": 445,
            "rarity": 76,
            "type": "treeFrog(2)",
            "ranking": 2837
        },
        {
            "id": 448,
            "rarity": 76,
            "type": "treeFrog(8)",
            "ranking": 2838
        },
        {
            "id": 502,
            "rarity": 76,
            "type": "goldenTreeFrog",
            "ranking": 2839
        },
        {
            "id": 521,
            "rarity": 76,
            "type": "treeFrog(2)",
            "ranking": 2840
        },
        {
            "id": 558,
            "rarity": 76,
            "type": "goldenTreeFrog",
            "ranking": 2841
        },
        {
            "id": 777,
            "rarity": 76,
            "type": "treeFrog(7)",
            "ranking": 2842
        },
        {
            "id": 827,
            "rarity": 76,
            "type": "cyanTreeFrog",
            "ranking": 2843
        },
        {
            "id": 1197,
            "rarity": 76,
            "type": "goldenTreeFrog",
            "ranking": 2844
        },
        {
            "id": 1453,
            "rarity": 76,
            "type": "cyanTreeFrog",
            "ranking": 2845
        },
        {
            "id": 1497,
            "rarity": 76,
            "type": "splendidLeafFrog",
            "ranking": 2846
        },
        {
            "id": 1668,
            "rarity": 76,
            "type": "goldenTreeFrog",
            "ranking": 2847
        },
        {
            "id": 1718,
            "rarity": 76,
            "type": "treeFrog(7)",
            "ranking": 2848
        },
        {
            "id": 1874,
            "rarity": 76,
            "type": "treeFrog(8)",
            "ranking": 2849
        },
        {
            "id": 2325,
            "rarity": 76,
            "type": "goldenTreeFrog",
            "ranking": 2850
        },
        {
            "id": 2643,
            "rarity": 76,
            "type": "treeFrog(6)",
            "ranking": 2851
        },
        {
            "id": 3209,
            "rarity": 76,
            "type": "treeFrog(2)",
            "ranking": 2852
        },
        {
            "id": 3391,
            "rarity": 76,
            "type": "treeFrog(7)",
            "ranking": 2853
        },
        {
            "id": 3422,
            "rarity": 76,
            "type": "goldenTreeFrog",
            "ranking": 2854
        },
        {
            "id": 3607,
            "rarity": 76,
            "type": "treeFrog(7)",
            "ranking": 2855
        },
        {
            "id": 3688,
            "rarity": 76,
            "type": "lightBrownTreeFrog",
            "ranking": 2856
        },
        {
            "id": 3728,
            "rarity": 76,
            "type": "splendidLeafFrog",
            "ranking": 2857
        },
        {
            "id": 87,
            "rarity": 75,
            "type": "lightBrownTreeFrog",
            "ranking": 2858
        },
        {
            "id": 204,
            "rarity": 75,
            "type": "lightBrownTreeFrog",
            "ranking": 2859
        },
        {
            "id": 487,
            "rarity": 75,
            "type": "cyanTreeFrog",
            "ranking": 2860
        },
        {
            "id": 618,
            "rarity": 75,
            "type": "treeFrog(8)",
            "ranking": 2861
        },
        {
            "id": 671,
            "rarity": 75,
            "type": "brownTreeFrog",
            "ranking": 2862
        },
        {
            "id": 1206,
            "rarity": 75,
            "type": "splendidLeafFrog",
            "ranking": 2863
        },
        {
            "id": 1327,
            "rarity": 75,
            "type": "lightBrownTreeFrog",
            "ranking": 2864
        },
        {
            "id": 1393,
            "rarity": 75,
            "type": "treeFrog(8)",
            "ranking": 2865
        },
        {
            "id": 1816,
            "rarity": 75,
            "type": "goldenTreeFrog",
            "ranking": 2866
        },
        {
            "id": 1954,
            "rarity": 75,
            "type": "cyanTreeFrog",
            "ranking": 2867
        },
        {
            "id": 2035,
            "rarity": 75,
            "type": "treeFrog(2)",
            "ranking": 2868
        },
        {
            "id": 2067,
            "rarity": 75,
            "type": "splendidLeafFrog",
            "ranking": 2869
        },
        {
            "id": 2386,
            "rarity": 75,
            "type": "splendidLeafFrog",
            "ranking": 2870
        },
        {
            "id": 2508,
            "rarity": 75,
            "type": "cyanTreeFrog",
            "ranking": 2871
        },
        {
            "id": 2514,
            "rarity": 75,
            "type": "treeFrog(1)",
            "ranking": 2872
        },
        {
            "id": 2678,
            "rarity": 75,
            "type": "splendidLeafFrog",
            "ranking": 2873
        },
        {
            "id": 2735,
            "rarity": 75,
            "type": "cyanTreeFrog",
            "ranking": 2874
        },
        {
            "id": 2754,
            "rarity": 75,
            "type": "treeFrog(1)",
            "ranking": 2875
        },
        {
            "id": 2840,
            "rarity": 75,
            "type": "treeFrog(6)",
            "ranking": 2876
        },
        {
            "id": 2931,
            "rarity": 75,
            "type": "treeFrog(2)",
            "ranking": 2877
        },
        {
            "id": 2980,
            "rarity": 75,
            "type": "treeFrog(2)",
            "ranking": 2878
        },
        {
            "id": 3094,
            "rarity": 75,
            "type": "treeFrog(2)",
            "ranking": 2879
        },
        {
            "id": 3255,
            "rarity": 75,
            "type": "brownTreeFrog",
            "ranking": 2880
        },
        {
            "id": 3889,
            "rarity": 75,
            "type": "treeFrog(8)",
            "ranking": 2881
        },
        {
            "id": 3952,
            "rarity": 75,
            "type": "treeFrog(8)",
            "ranking": 2882
        },
        {
            "id": 4002,
            "rarity": 75,
            "type": "treeFrog(3)",
            "ranking": 2883
        },
        {
            "id": 114,
            "rarity": 74,
            "type": "treeFrog(1)",
            "ranking": 2884
        },
        {
            "id": 321,
            "rarity": 74,
            "type": "splendidLeafFrog",
            "ranking": 2885
        },
        {
            "id": 332,
            "rarity": 74,
            "type": "treeFrog(3)",
            "ranking": 2886
        },
        {
            "id": 493,
            "rarity": 74,
            "type": "treeFrog(2)",
            "ranking": 2887
        },
        {
            "id": 911,
            "rarity": 74,
            "type": "treeFrog(1)",
            "ranking": 2888
        },
        {
            "id": 980,
            "rarity": 74,
            "type": "treeFrog(3)",
            "ranking": 2889
        },
        {
            "id": 1016,
            "rarity": 74,
            "type": "treeFrog(2)",
            "ranking": 2890
        },
        {
            "id": 1065,
            "rarity": 74,
            "type": "splendidLeafFrog",
            "ranking": 2891
        },
        {
            "id": 1430,
            "rarity": 74,
            "type": "treeFrog(5)",
            "ranking": 2892
        },
        {
            "id": 1962,
            "rarity": 74,
            "type": "cyanTreeFrog",
            "ranking": 2893
        },
        {
            "id": 3123,
            "rarity": 74,
            "type": "treeFrog(2)",
            "ranking": 2894
        },
        {
            "id": 3705,
            "rarity": 74,
            "type": "treeFrog(1)",
            "ranking": 2895
        },
        {
            "id": 3825,
            "rarity": 74,
            "type": "treeFrog(2)",
            "ranking": 2896
        },
        {
            "id": 3981,
            "rarity": 74,
            "type": "splendidLeafFrog",
            "ranking": 2897
        },
        {
            "id": 43,
            "rarity": 73,
            "type": "treeFrog(3)",
            "ranking": 2898
        },
        {
            "id": 361,
            "rarity": 73,
            "type": "treeFrog(4)",
            "ranking": 2899
        },
        {
            "id": 544,
            "rarity": 73,
            "type": "splendidLeafFrog",
            "ranking": 2900
        },
        {
            "id": 601,
            "rarity": 73,
            "type": "treeFrog(4)",
            "ranking": 2901
        },
        {
            "id": 1194,
            "rarity": 73,
            "type": "treeFrog(1)",
            "ranking": 2902
        },
        {
            "id": 1237,
            "rarity": 73,
            "type": "splendidLeafFrog",
            "ranking": 2903
        },
        {
            "id": 1272,
            "rarity": 73,
            "type": "splendidLeafFrog",
            "ranking": 2904
        },
        {
            "id": 1288,
            "rarity": 73,
            "type": "splendidLeafFrog",
            "ranking": 2905
        },
        {
            "id": 1490,
            "rarity": 73,
            "type": "treeFrog(8)",
            "ranking": 2906
        },
        {
            "id": 1842,
            "rarity": 73,
            "type": "treeFrog(3)",
            "ranking": 2907
        },
        {
            "id": 2671,
            "rarity": 73,
            "type": "splendidLeafFrog",
            "ranking": 2908
        },
        {
            "id": 2715,
            "rarity": 73,
            "type": "treeFrog(1)",
            "ranking": 2909
        },
        {
            "id": 2752,
            "rarity": 73,
            "type": "treeFrog(2)",
            "ranking": 2910
        },
        {
            "id": 2914,
            "rarity": 73,
            "type": "splendidLeafFrog",
            "ranking": 2911
        },
        {
            "id": 3296,
            "rarity": 73,
            "type": "treeFrog(1)",
            "ranking": 2912
        },
        {
            "id": 3507,
            "rarity": 73,
            "type": "treeFrog(1)",
            "ranking": 2913
        },
        {
            "id": 322,
            "rarity": 72,
            "type": "treeFrog(3)",
            "ranking": 2914
        },
        {
            "id": 364,
            "rarity": 72,
            "type": "treeFrog(2)",
            "ranking": 2915
        },
        {
            "id": 663,
            "rarity": 72,
            "type": "treeFrog(3)",
            "ranking": 2916
        },
        {
            "id": 805,
            "rarity": 72,
            "type": "splendidLeafFrog",
            "ranking": 2917
        },
        {
            "id": 816,
            "rarity": 72,
            "type": "treeFrog(1)",
            "ranking": 2918
        },
        {
            "id": 1317,
            "rarity": 72,
            "type": "treeFrog(2)",
            "ranking": 2919
        },
        {
            "id": 2364,
            "rarity": 72,
            "type": "treeFrog(4)",
            "ranking": 2920
        },
        {
            "id": 2387,
            "rarity": 72,
            "type": "treeFrog(1)",
            "ranking": 2921
        },
        {
            "id": 2563,
            "rarity": 72,
            "type": "treeFrog(1)",
            "ranking": 2922
        },
        {
            "id": 2848,
            "rarity": 72,
            "type": "purpleTreeFrog",
            "ranking": 2923
        },
        {
            "id": 2957,
            "rarity": 72,
            "type": "treeFrog(2)",
            "ranking": 2924
        },
        {
            "id": 2961,
            "rarity": 72,
            "type": "treeFrog(2)",
            "ranking": 2925
        },
        {
            "id": 3418,
            "rarity": 72,
            "type": "purpleTreeFrog",
            "ranking": 2926
        },
        {
            "id": 3561,
            "rarity": 72,
            "type": "treeFrog(2)",
            "ranking": 2927
        },
        {
            "id": 296,
            "rarity": 71,
            "type": "purpleTreeFrog",
            "ranking": 2928
        },
        {
            "id": 550,
            "rarity": 71,
            "type": "treeFrog(1)",
            "ranking": 2929
        },
        {
            "id": 826,
            "rarity": 71,
            "type": "purpleTreeFrog",
            "ranking": 2930
        },
        {
            "id": 865,
            "rarity": 71,
            "type": "treeFrog(5)",
            "ranking": 2931
        },
        {
            "id": 975,
            "rarity": 71,
            "type": "treeFrog(2)",
            "ranking": 2932
        },
        {
            "id": 1227,
            "rarity": 71,
            "type": "treeFrog(5)",
            "ranking": 2933
        },
        {
            "id": 1445,
            "rarity": 71,
            "type": "treeFrog(4)",
            "ranking": 2934
        },
        {
            "id": 1739,
            "rarity": 71,
            "type": "treeFrog(1)",
            "ranking": 2935
        },
        {
            "id": 1776,
            "rarity": 71,
            "type": "treeFrog(1)",
            "ranking": 2936
        },
        {
            "id": 2110,
            "rarity": 71,
            "type": "treeFrog(4)",
            "ranking": 2937
        },
        {
            "id": 2194,
            "rarity": 71,
            "type": "treeFrog(3)",
            "ranking": 2938
        },
        {
            "id": 2223,
            "rarity": 71,
            "type": "treeFrog(3)",
            "ranking": 2939
        },
        {
            "id": 2333,
            "rarity": 71,
            "type": "treeFrog(3)",
            "ranking": 2940
        },
        {
            "id": 2484,
            "rarity": 71,
            "type": "treeFrog(2)",
            "ranking": 2941
        },
        {
            "id": 2781,
            "rarity": 71,
            "type": "treeFrog(3)",
            "ranking": 2942
        },
        {
            "id": 2965,
            "rarity": 71,
            "type": "treeFrog(2)",
            "ranking": 2943
        },
        {
            "id": 3036,
            "rarity": 71,
            "type": "treeFrog(2)",
            "ranking": 2944
        },
        {
            "id": 3259,
            "rarity": 71,
            "type": "purpleTreeFrog",
            "ranking": 2945
        },
        {
            "id": 3374,
            "rarity": 71,
            "type": "treeFrog(1)",
            "ranking": 2946
        },
        {
            "id": 3413,
            "rarity": 71,
            "type": "treeFrog(1)",
            "ranking": 2947
        },
        {
            "id": 3491,
            "rarity": 71,
            "type": "treeFrog(1)",
            "ranking": 2948
        },
        {
            "id": 3959,
            "rarity": 71,
            "type": "treeFrog(2)",
            "ranking": 2949
        },
        {
            "id": 367,
            "rarity": 70,
            "type": "treeFrog(3)",
            "ranking": 2950
        },
        {
            "id": 526,
            "rarity": 70,
            "type": "treeFrog(3)",
            "ranking": 2951
        },
        {
            "id": 661,
            "rarity": 70,
            "type": "purpleTreeFrog",
            "ranking": 2952
        },
        {
            "id": 886,
            "rarity": 70,
            "type": "treeFrog(2)",
            "ranking": 2953
        },
        {
            "id": 1058,
            "rarity": 70,
            "type": "treeFrog(3)",
            "ranking": 2954
        },
        {
            "id": 1088,
            "rarity": 70,
            "type": "treeFrog(2)",
            "ranking": 2955
        },
        {
            "id": 1251,
            "rarity": 70,
            "type": "treeFrog(2)",
            "ranking": 2956
        },
        {
            "id": 1404,
            "rarity": 70,
            "type": "treeFrog(4)",
            "ranking": 2957
        },
        {
            "id": 1420,
            "rarity": 70,
            "type": "treeFrog(3)",
            "ranking": 2958
        },
        {
            "id": 2395,
            "rarity": 70,
            "type": "treeFrog(4)",
            "ranking": 2959
        },
        {
            "id": 2407,
            "rarity": 70,
            "type": "purpleTreeFrog",
            "ranking": 2960
        },
        {
            "id": 2497,
            "rarity": 70,
            "type": "treeFrog(4)",
            "ranking": 2961
        },
        {
            "id": 2884,
            "rarity": 70,
            "type": "purpleTreeFrog",
            "ranking": 2962
        },
        {
            "id": 3193,
            "rarity": 70,
            "type": "purpleTreeFrog",
            "ranking": 2963
        },
        {
            "id": 3301,
            "rarity": 70,
            "type": "treeFrog(1)",
            "ranking": 2964
        },
        {
            "id": 3414,
            "rarity": 70,
            "type": "treeFrog(3)",
            "ranking": 2965
        },
        {
            "id": 3590,
            "rarity": 70,
            "type": "orangeTreeFrog",
            "ranking": 2966
        },
        {
            "id": 3595,
            "rarity": 70,
            "type": "orangeTreeFrog",
            "ranking": 2967
        },
        {
            "id": 3913,
            "rarity": 70,
            "type": "treeFrog(3)",
            "ranking": 2968
        },
        {
            "id": 54,
            "rarity": 69,
            "type": "treeFrog(3)",
            "ranking": 2969
        },
        {
            "id": 60,
            "rarity": 69,
            "type": "treeFrog(3)",
            "ranking": 2970
        },
        {
            "id": 196,
            "rarity": 69,
            "type": "orangeTreeFrog",
            "ranking": 2971
        },
        {
            "id": 531,
            "rarity": 69,
            "type": "treeFrog(4)",
            "ranking": 2972
        },
        {
            "id": 583,
            "rarity": 69,
            "type": "treeFrog(3)",
            "ranking": 2973
        },
        {
            "id": 755,
            "rarity": 69,
            "type": "stawberryDartFrog",
            "ranking": 2974
        },
        {
            "id": 780,
            "rarity": 69,
            "type": "purpleTreeFrog",
            "ranking": 2975
        },
        {
            "id": 1562,
            "rarity": 69,
            "type": "treeFrog(4)",
            "ranking": 2976
        },
        {
            "id": 1626,
            "rarity": 69,
            "type": "blueDartFrog",
            "ranking": 2977
        },
        {
            "id": 1679,
            "rarity": 69,
            "type": "stawberryDartFrog",
            "ranking": 2978
        },
        {
            "id": 1870,
            "rarity": 69,
            "type": "blueDartFrog",
            "ranking": 2979
        },
        {
            "id": 2298,
            "rarity": 69,
            "type": "pinkTreeFrog",
            "ranking": 2980
        },
        {
            "id": 2391,
            "rarity": 69,
            "type": "treeFrog(4)",
            "ranking": 2981
        },
        {
            "id": 2492,
            "rarity": 69,
            "type": "treeFrog(5)",
            "ranking": 2982
        },
        {
            "id": 2634,
            "rarity": 69,
            "type": "treeFrog(4)",
            "ranking": 2983
        },
        {
            "id": 2636,
            "rarity": 69,
            "type": "treeFrog(4)",
            "ranking": 2984
        },
        {
            "id": 2669,
            "rarity": 69,
            "type": "treeFrog(3)",
            "ranking": 2985
        },
        {
            "id": 2798,
            "rarity": 69,
            "type": "treeFrog(5)",
            "ranking": 2986
        },
        {
            "id": 3001,
            "rarity": 69,
            "type": "treeFrog(4)",
            "ranking": 2987
        },
        {
            "id": 3159,
            "rarity": 69,
            "type": "purpleTreeFrog",
            "ranking": 2988
        },
        {
            "id": 3428,
            "rarity": 69,
            "type": "treeFrog(2)",
            "ranking": 2989
        },
        {
            "id": 3580,
            "rarity": 69,
            "type": "pinkTreeFrog",
            "ranking": 2990
        },
        {
            "id": 3633,
            "rarity": 69,
            "type": "purpleTreeFrog",
            "ranking": 2991
        },
        {
            "id": 3666,
            "rarity": 69,
            "type": "treeFrog(3)",
            "ranking": 2992
        },
        {
            "id": 3803,
            "rarity": 69,
            "type": "treeFrog(5)",
            "ranking": 2993
        },
        {
            "id": 3916,
            "rarity": 69,
            "type": "orangeTreeFrog",
            "ranking": 2994
        },
        {
            "id": 3975,
            "rarity": 69,
            "type": "orangeTreeFrog",
            "ranking": 2995
        },
        {
            "id": 126,
            "rarity": 68,
            "type": "treeFrog(3)",
            "ranking": 2996
        },
        {
            "id": 210,
            "rarity": 68,
            "type": "treeFrog(2)",
            "ranking": 2997
        },
        {
            "id": 284,
            "rarity": 68,
            "type": "treeFrog(4)",
            "ranking": 2998
        },
        {
            "id": 390,
            "rarity": 68,
            "type": "treeFrog(2)",
            "ranking": 2999
        },
        {
            "id": 483,
            "rarity": 68,
            "type": "treeFrog(2)",
            "ranking": 3000
        },
        {
            "id": 682,
            "rarity": 68,
            "type": "pinkTreeFrog",
            "ranking": 3001
        },
        {
            "id": 743,
            "rarity": 68,
            "type": "purpleTreeFrog",
            "ranking": 3002
        },
        {
            "id": 941,
            "rarity": 68,
            "type": "purpleTreeFrog",
            "ranking": 3003
        },
        {
            "id": 1068,
            "rarity": 68,
            "type": "treeFrog(2)",
            "ranking": 3004
        },
        {
            "id": 1109,
            "rarity": 68,
            "type": "orangeTreeFrog",
            "ranking": 3005
        },
        {
            "id": 1287,
            "rarity": 68,
            "type": "blueDartFrog",
            "ranking": 3006
        },
        {
            "id": 1419,
            "rarity": 68,
            "type": "treeFrog(4)",
            "ranking": 3007
        },
        {
            "id": 1454,
            "rarity": 68,
            "type": "treeFrog(2)",
            "ranking": 3008
        },
        {
            "id": 1485,
            "rarity": 68,
            "type": "treeFrog(2)",
            "ranking": 3009
        },
        {
            "id": 1512,
            "rarity": 68,
            "type": "pinkTreeFrog",
            "ranking": 3010
        },
        {
            "id": 1577,
            "rarity": 68,
            "type": "purpleTreeFrog",
            "ranking": 3011
        },
        {
            "id": 1581,
            "rarity": 68,
            "type": "purpleTreeFrog",
            "ranking": 3012
        },
        {
            "id": 1606,
            "rarity": 68,
            "type": "stawberryDartFrog",
            "ranking": 3013
        },
        {
            "id": 1670,
            "rarity": 68,
            "type": "blueDartFrog",
            "ranking": 3014
        },
        {
            "id": 1826,
            "rarity": 68,
            "type": "treeFrog(4)",
            "ranking": 3015
        },
        {
            "id": 1868,
            "rarity": 68,
            "type": "treeFrog(6)",
            "ranking": 3016
        },
        {
            "id": 1999,
            "rarity": 68,
            "type": "treeFrog(4)",
            "ranking": 3017
        },
        {
            "id": 2008,
            "rarity": 68,
            "type": "treeFrog(3)",
            "ranking": 3018
        },
        {
            "id": 2019,
            "rarity": 68,
            "type": "orangeTreeFrog",
            "ranking": 3019
        },
        {
            "id": 2376,
            "rarity": 68,
            "type": "stawberryDartFrog",
            "ranking": 3020
        },
        {
            "id": 2652,
            "rarity": 68,
            "type": "orangeTreeFrog",
            "ranking": 3021
        },
        {
            "id": 2739,
            "rarity": 68,
            "type": "purpleTreeFrog",
            "ranking": 3022
        },
        {
            "id": 2994,
            "rarity": 68,
            "type": "pinkTreeFrog",
            "ranking": 3023
        },
        {
            "id": 3000,
            "rarity": 68,
            "type": "treeFrog(2)",
            "ranking": 3024
        },
        {
            "id": 3256,
            "rarity": 68,
            "type": "treeFrog(4)",
            "ranking": 3025
        },
        {
            "id": 3286,
            "rarity": 68,
            "type": "purpleTreeFrog",
            "ranking": 3026
        },
        {
            "id": 3393,
            "rarity": 68,
            "type": "treeFrog(4)",
            "ranking": 3027
        },
        {
            "id": 3398,
            "rarity": 68,
            "type": "treeFrog(2)",
            "ranking": 3028
        },
        {
            "id": 3559,
            "rarity": 68,
            "type": "treeFrog(2)",
            "ranking": 3029
        },
        {
            "id": 3748,
            "rarity": 68,
            "type": "treeFrog(6)",
            "ranking": 3030
        },
        {
            "id": 3792,
            "rarity": 68,
            "type": "orangeTreeFrog",
            "ranking": 3031
        },
        {
            "id": 3932,
            "rarity": 68,
            "type": "treeFrog(5)",
            "ranking": 3032
        },
        {
            "id": 3938,
            "rarity": 68,
            "type": "treeFrog(5)",
            "ranking": 3033
        },
        {
            "id": 52,
            "rarity": 67,
            "type": "treeFrog(4)",
            "ranking": 3034
        },
        {
            "id": 363,
            "rarity": 67,
            "type": "treeFrog(2)",
            "ranking": 3035
        },
        {
            "id": 449,
            "rarity": 67,
            "type": "treeFrog(5)",
            "ranking": 3036
        },
        {
            "id": 573,
            "rarity": 67,
            "type": "treeFrog(5)",
            "ranking": 3037
        },
        {
            "id": 662,
            "rarity": 67,
            "type": "treeFrog(2)",
            "ranking": 3038
        },
        {
            "id": 811,
            "rarity": 67,
            "type": "stawberryDartFrog",
            "ranking": 3039
        },
        {
            "id": 884,
            "rarity": 67,
            "type": "orangeTreeFrog",
            "ranking": 3040
        },
        {
            "id": 897,
            "rarity": 67,
            "type": "blueDartFrog",
            "ranking": 3041
        },
        {
            "id": 1106,
            "rarity": 67,
            "type": "stawberryDartFrog",
            "ranking": 3042
        },
        {
            "id": 1359,
            "rarity": 67,
            "type": "treeFrog(3)",
            "ranking": 3043
        },
        {
            "id": 1482,
            "rarity": 67,
            "type": "stawberryDartFrog",
            "ranking": 3044
        },
        {
            "id": 1700,
            "rarity": 67,
            "type": "grayTreeFrog",
            "ranking": 3045
        },
        {
            "id": 1719,
            "rarity": 67,
            "type": "pinkTreeFrog",
            "ranking": 3046
        },
        {
            "id": 1808,
            "rarity": 67,
            "type": "treeFrog(2)",
            "ranking": 3047
        },
        {
            "id": 1853,
            "rarity": 67,
            "type": "stawberryDartFrog",
            "ranking": 3048
        },
        {
            "id": 1969,
            "rarity": 67,
            "type": "treeFrog(5)",
            "ranking": 3049
        },
        {
            "id": 2073,
            "rarity": 67,
            "type": "pinkTreeFrog",
            "ranking": 3050
        },
        {
            "id": 2148,
            "rarity": 67,
            "type": "tomatoFrog",
            "ranking": 3051
        },
        {
            "id": 2274,
            "rarity": 67,
            "type": "treeFrog(7)",
            "ranking": 3052
        },
        {
            "id": 2301,
            "rarity": 67,
            "type": "treeFrog(5)",
            "ranking": 3053
        },
        {
            "id": 2344,
            "rarity": 67,
            "type": "purpleTreeFrog",
            "ranking": 3054
        },
        {
            "id": 2486,
            "rarity": 67,
            "type": "blueDartFrog",
            "ranking": 3055
        },
        {
            "id": 2523,
            "rarity": 67,
            "type": "treeFrog(5)",
            "ranking": 3056
        },
        {
            "id": 2579,
            "rarity": 67,
            "type": "blueDartFrog",
            "ranking": 3057
        },
        {
            "id": 2598,
            "rarity": 67,
            "type": "treeFrog(5)",
            "ranking": 3058
        },
        {
            "id": 2642,
            "rarity": 67,
            "type": "blueDartFrog",
            "ranking": 3059
        },
        {
            "id": 2647,
            "rarity": 67,
            "type": "treeFrog(6)",
            "ranking": 3060
        },
        {
            "id": 2667,
            "rarity": 67,
            "type": "treeFrog(3)",
            "ranking": 3061
        },
        {
            "id": 2744,
            "rarity": 67,
            "type": "tomatoFrog",
            "ranking": 3062
        },
        {
            "id": 2795,
            "rarity": 67,
            "type": "pinkTreeFrog",
            "ranking": 3063
        },
        {
            "id": 3131,
            "rarity": 67,
            "type": "treeFrog(3)",
            "ranking": 3064
        },
        {
            "id": 3143,
            "rarity": 67,
            "type": "orangeTreeFrog",
            "ranking": 3065
        },
        {
            "id": 3346,
            "rarity": 67,
            "type": "grayTreeFrog",
            "ranking": 3066
        },
        {
            "id": 3389,
            "rarity": 67,
            "type": "treeFrog(2)",
            "ranking": 3067
        },
        {
            "id": 3556,
            "rarity": 67,
            "type": "treeFrog(5)",
            "ranking": 3068
        },
        {
            "id": 3565,
            "rarity": 67,
            "type": "orangeTreeFrog",
            "ranking": 3069
        },
        {
            "id": 3717,
            "rarity": 67,
            "type": "treeFrog(2)",
            "ranking": 3070
        },
        {
            "id": 3928,
            "rarity": 67,
            "type": "treeFrog(5)",
            "ranking": 3071
        },
        {
            "id": 4006,
            "rarity": 67,
            "type": "pinkTreeFrog",
            "ranking": 3072
        },
        {
            "id": 119,
            "rarity": 66,
            "type": "treeFrog(4)",
            "ranking": 3073
        },
        {
            "id": 153,
            "rarity": 66,
            "type": "treeFrog(6)",
            "ranking": 3074
        },
        {
            "id": 183,
            "rarity": 66,
            "type": "orangeTreeFrog",
            "ranking": 3075
        },
        {
            "id": 198,
            "rarity": 66,
            "type": "blueDartFrog",
            "ranking": 3076
        },
        {
            "id": 315,
            "rarity": 66,
            "type": "treeFrog(3)",
            "ranking": 3077
        },
        {
            "id": 462,
            "rarity": 66,
            "type": "blueTreeFrog",
            "ranking": 3078
        },
        {
            "id": 529,
            "rarity": 66,
            "type": "pinkTreeFrog",
            "ranking": 3079
        },
        {
            "id": 545,
            "rarity": 66,
            "type": "treeFrog(6)",
            "ranking": 3080
        },
        {
            "id": 554,
            "rarity": 66,
            "type": "unknown",
            "ranking": 3081
        },
        {
            "id": 651,
            "rarity": 66,
            "type": "greenTreeFrog",
            "ranking": 3082
        },
        {
            "id": 708,
            "rarity": 66,
            "type": "blueDartFrog",
            "ranking": 3083
        },
        {
            "id": 748,
            "rarity": 66,
            "type": "treeFrog(4)",
            "ranking": 3084
        },
        {
            "id": 756,
            "rarity": 66,
            "type": "orangeTreeFrog",
            "ranking": 3085
        },
        {
            "id": 820,
            "rarity": 66,
            "type": "treeFrog(4)",
            "ranking": 3086
        },
        {
            "id": 923,
            "rarity": 66,
            "type": "pinkTreeFrog",
            "ranking": 3087
        },
        {
            "id": 942,
            "rarity": 66,
            "type": "orangeTreeFrog",
            "ranking": 3088
        },
        {
            "id": 1089,
            "rarity": 66,
            "type": "treeFrog(3)",
            "ranking": 3089
        },
        {
            "id": 1442,
            "rarity": 66,
            "type": "treeFrog(7)",
            "ranking": 3090
        },
        {
            "id": 1531,
            "rarity": 66,
            "type": "goldenDartFrog",
            "ranking": 3091
        },
        {
            "id": 1627,
            "rarity": 66,
            "type": "treeFrog(5)",
            "ranking": 3092
        },
        {
            "id": 1641,
            "rarity": 66,
            "type": "tomatoFrog",
            "ranking": 3093
        },
        {
            "id": 1686,
            "rarity": 66,
            "type": "treeFrog(5)",
            "ranking": 3094
        },
        {
            "id": 1696,
            "rarity": 66,
            "type": "treeFrog(6)",
            "ranking": 3095
        },
        {
            "id": 1806,
            "rarity": 66,
            "type": "treeFrog(5)",
            "ranking": 3096
        },
        {
            "id": 1898,
            "rarity": 66,
            "type": "treeFrog(4)",
            "ranking": 3097
        },
        {
            "id": 1924,
            "rarity": 66,
            "type": "blueTreeFrog",
            "ranking": 3098
        },
        {
            "id": 2057,
            "rarity": 66,
            "type": "greenTreeFrog",
            "ranking": 3099
        },
        {
            "id": 2149,
            "rarity": 66,
            "type": "treeFrog(4)",
            "ranking": 3100
        },
        {
            "id": 2150,
            "rarity": 66,
            "type": "treeFrog(2)",
            "ranking": 3101
        },
        {
            "id": 2172,
            "rarity": 66,
            "type": "unknown",
            "ranking": 3102
        },
        {
            "id": 2253,
            "rarity": 66,
            "type": "grayTreeFrog",
            "ranking": 3103
        },
        {
            "id": 2504,
            "rarity": 66,
            "type": "treeFrog(2)",
            "ranking": 3104
        },
        {
            "id": 2518,
            "rarity": 66,
            "type": "treeFrog(3)",
            "ranking": 3105
        },
        {
            "id": 2570,
            "rarity": 66,
            "type": "stawberryDartFrog",
            "ranking": 3106
        },
        {
            "id": 2625,
            "rarity": 66,
            "type": "treeFrog(5)",
            "ranking": 3107
        },
        {
            "id": 2771,
            "rarity": 66,
            "type": "treeFrog(5)",
            "ranking": 3108
        },
        {
            "id": 2923,
            "rarity": 66,
            "type": "tomatoFrog",
            "ranking": 3109
        },
        {
            "id": 2935,
            "rarity": 66,
            "type": "stawberryDartFrog",
            "ranking": 3110
        },
        {
            "id": 2958,
            "rarity": 66,
            "type": "treeFrog(8)",
            "ranking": 3111
        },
        {
            "id": 3077,
            "rarity": 66,
            "type": "goldenDartFrog",
            "ranking": 3112
        },
        {
            "id": 3126,
            "rarity": 66,
            "type": "treeFrog(5)",
            "ranking": 3113
        },
        {
            "id": 3145,
            "rarity": 66,
            "type": "treeFrog(7)",
            "ranking": 3114
        },
        {
            "id": 3260,
            "rarity": 66,
            "type": "treeFrog(6)",
            "ranking": 3115
        },
        {
            "id": 3342,
            "rarity": 66,
            "type": "treeFrog(4)",
            "ranking": 3116
        },
        {
            "id": 3453,
            "rarity": 66,
            "type": "treeFrog(4)",
            "ranking": 3117
        },
        {
            "id": 3528,
            "rarity": 66,
            "type": "orangeTreeFrog",
            "ranking": 3118
        },
        {
            "id": 3536,
            "rarity": 66,
            "type": "pinkTreeFrog",
            "ranking": 3119
        },
        {
            "id": 3779,
            "rarity": 66,
            "type": "tomatoFrog",
            "ranking": 3120
        },
        {
            "id": 3786,
            "rarity": 66,
            "type": "orangeTreeFrog",
            "ranking": 3121
        },
        {
            "id": 3856,
            "rarity": 66,
            "type": "stawberryDartFrog",
            "ranking": 3122
        },
        {
            "id": 3872,
            "rarity": 66,
            "type": "grayTreeFrog",
            "ranking": 3123
        },
        {
            "id": 3876,
            "rarity": 66,
            "type": "orangeTreeFrog",
            "ranking": 3124
        },
        {
            "id": 3934,
            "rarity": 66,
            "type": "treeFrog(2)",
            "ranking": 3125
        },
        {
            "id": 3997,
            "rarity": 66,
            "type": "blueDartFrog",
            "ranking": 3126
        },
        {
            "id": 58,
            "rarity": 65,
            "type": "greenTreeFrog",
            "ranking": 3127
        },
        {
            "id": 227,
            "rarity": 65,
            "type": "treeFrog(4)",
            "ranking": 3128
        },
        {
            "id": 239,
            "rarity": 65,
            "type": "tomatoFrog",
            "ranking": 3129
        },
        {
            "id": 309,
            "rarity": 65,
            "type": "treeFrog(6)",
            "ranking": 3130
        },
        {
            "id": 362,
            "rarity": 65,
            "type": "treeFrog(6)",
            "ranking": 3131
        },
        {
            "id": 475,
            "rarity": 65,
            "type": "treeFrog(3)",
            "ranking": 3132
        },
        {
            "id": 582,
            "rarity": 65,
            "type": "treeFrog(6)",
            "ranking": 3133
        },
        {
            "id": 643,
            "rarity": 65,
            "type": "treeFrog(7)",
            "ranking": 3134
        },
        {
            "id": 656,
            "rarity": 65,
            "type": "blueTreeFrog",
            "ranking": 3135
        },
        {
            "id": 686,
            "rarity": 65,
            "type": "goldenDartFrog",
            "ranking": 3136
        },
        {
            "id": 779,
            "rarity": 65,
            "type": "treeFrog(6)",
            "ranking": 3137
        },
        {
            "id": 785,
            "rarity": 65,
            "type": "blueTreeFrog",
            "ranking": 3138
        },
        {
            "id": 800,
            "rarity": 65,
            "type": "redEyedTreeFrog",
            "ranking": 3139
        },
        {
            "id": 801,
            "rarity": 65,
            "type": "unknown",
            "ranking": 3140
        },
        {
            "id": 846,
            "rarity": 65,
            "type": "grayTreeFrog",
            "ranking": 3141
        },
        {
            "id": 1069,
            "rarity": 65,
            "type": "stawberryDartFrog",
            "ranking": 3142
        },
        {
            "id": 1212,
            "rarity": 65,
            "type": "blueDartFrog",
            "ranking": 3143
        },
        {
            "id": 1248,
            "rarity": 65,
            "type": "greenTreeFrog",
            "ranking": 3144
        },
        {
            "id": 1292,
            "rarity": 65,
            "type": "treeFrog(2)",
            "ranking": 3145
        },
        {
            "id": 1389,
            "rarity": 65,
            "type": "treeFrog(3)",
            "ranking": 3146
        },
        {
            "id": 1619,
            "rarity": 65,
            "type": "redEyedTreeFrog",
            "ranking": 3147
        },
        {
            "id": 1703,
            "rarity": 65,
            "type": "treeFrog(6)",
            "ranking": 3148
        },
        {
            "id": 1820,
            "rarity": 65,
            "type": "grayTreeFrog",
            "ranking": 3149
        },
        {
            "id": 1835,
            "rarity": 65,
            "type": "unknown",
            "ranking": 3150
        },
        {
            "id": 1866,
            "rarity": 65,
            "type": "treeFrog(3)",
            "ranking": 3151
        },
        {
            "id": 1869,
            "rarity": 65,
            "type": "treeFrog(7)",
            "ranking": 3152
        },
        {
            "id": 1882,
            "rarity": 65,
            "type": "pinkTreeFrog",
            "ranking": 3153
        },
        {
            "id": 1981,
            "rarity": 65,
            "type": "blueDartFrog",
            "ranking": 3154
        },
        {
            "id": 2082,
            "rarity": 65,
            "type": "pinkTreeFrog",
            "ranking": 3155
        },
        {
            "id": 2092,
            "rarity": 65,
            "type": "grayTreeFrog",
            "ranking": 3156
        },
        {
            "id": 2164,
            "rarity": 65,
            "type": "greenTreeFrog",
            "ranking": 3157
        },
        {
            "id": 2204,
            "rarity": 65,
            "type": "blueDartFrog",
            "ranking": 3158
        },
        {
            "id": 2312,
            "rarity": 65,
            "type": "stawberryDartFrog",
            "ranking": 3159
        },
        {
            "id": 2320,
            "rarity": 65,
            "type": "stawberryDartFrog",
            "ranking": 3160
        },
        {
            "id": 2409,
            "rarity": 65,
            "type": "tomatoFrog",
            "ranking": 3161
        },
        {
            "id": 2453,
            "rarity": 65,
            "type": "blueDartFrog",
            "ranking": 3162
        },
        {
            "id": 2455,
            "rarity": 65,
            "type": "treeFrog(8)",
            "ranking": 3163
        },
        {
            "id": 2536,
            "rarity": 65,
            "type": "treeFrog(5)",
            "ranking": 3164
        },
        {
            "id": 2586,
            "rarity": 65,
            "type": "treeFrog(5)",
            "ranking": 3165
        },
        {
            "id": 2605,
            "rarity": 65,
            "type": "treeFrog(3)",
            "ranking": 3166
        },
        {
            "id": 2712,
            "rarity": 65,
            "type": "stawberryDartFrog",
            "ranking": 3167
        },
        {
            "id": 2817,
            "rarity": 65,
            "type": "goldenDartFrog",
            "ranking": 3168
        },
        {
            "id": 2841,
            "rarity": 65,
            "type": "treeFrog(4)",
            "ranking": 3169
        },
        {
            "id": 2851,
            "rarity": 65,
            "type": "pinkTreeFrog",
            "ranking": 3170
        },
        {
            "id": 2886,
            "rarity": 65,
            "type": "treeFrog(7)",
            "ranking": 3171
        },
        {
            "id": 2950,
            "rarity": 65,
            "type": "treeFrog(2)",
            "ranking": 3172
        },
        {
            "id": 2955,
            "rarity": 65,
            "type": "stawberryDartFrog",
            "ranking": 3173
        },
        {
            "id": 2974,
            "rarity": 65,
            "type": "blueTreeFrog",
            "ranking": 3174
        },
        {
            "id": 2990,
            "rarity": 65,
            "type": "treeFrog(3)",
            "ranking": 3175
        },
        {
            "id": 3038,
            "rarity": 65,
            "type": "tomatoFrog",
            "ranking": 3176
        },
        {
            "id": 3104,
            "rarity": 65,
            "type": "stawberryDartFrog",
            "ranking": 3177
        },
        {
            "id": 3174,
            "rarity": 65,
            "type": "treeFrog(7)",
            "ranking": 3178
        },
        {
            "id": 3196,
            "rarity": 65,
            "type": "treeFrog(3)",
            "ranking": 3179
        },
        {
            "id": 3206,
            "rarity": 65,
            "type": "treeFrog(3)",
            "ranking": 3180
        },
        {
            "id": 3265,
            "rarity": 65,
            "type": "treeFrog(8)",
            "ranking": 3181
        },
        {
            "id": 3382,
            "rarity": 65,
            "type": "pinkTreeFrog",
            "ranking": 3182
        },
        {
            "id": 3397,
            "rarity": 65,
            "type": "grayTreeFrog",
            "ranking": 3183
        },
        {
            "id": 3409,
            "rarity": 65,
            "type": "blueDartFrog",
            "ranking": 3184
        },
        {
            "id": 3501,
            "rarity": 65,
            "type": "pinkTreeFrog",
            "ranking": 3185
        },
        {
            "id": 3663,
            "rarity": 65,
            "type": "treeFrog(5)",
            "ranking": 3186
        },
        {
            "id": 3673,
            "rarity": 65,
            "type": "orangeTreeFrog",
            "ranking": 3187
        },
        {
            "id": 3691,
            "rarity": 65,
            "type": "treeFrog(3)",
            "ranking": 3188
        },
        {
            "id": 3782,
            "rarity": 65,
            "type": "blueDartFrog",
            "ranking": 3189
        },
        {
            "id": 3810,
            "rarity": 65,
            "type": "treeFrog(4)",
            "ranking": 3190
        },
        {
            "id": 3839,
            "rarity": 65,
            "type": "treeFrog(5)",
            "ranking": 3191
        },
        {
            "id": 3863,
            "rarity": 65,
            "type": "treeFrog(6)",
            "ranking": 3192
        },
        {
            "id": 3944,
            "rarity": 65,
            "type": "pinkTreeFrog",
            "ranking": 3193
        },
        {
            "id": 3955,
            "rarity": 65,
            "type": "tomatoFrog",
            "ranking": 3194
        },
        {
            "id": 3957,
            "rarity": 65,
            "type": "treeFrog(6)",
            "ranking": 3195
        },
        {
            "id": 106,
            "rarity": 64,
            "type": "treeFrog(3)",
            "ranking": 3196
        },
        {
            "id": 112,
            "rarity": 64,
            "type": "treeFrog(6)",
            "ranking": 3197
        },
        {
            "id": 118,
            "rarity": 64,
            "type": "treeFrog(3)",
            "ranking": 3198
        },
        {
            "id": 122,
            "rarity": 64,
            "type": "treeFrog(4)",
            "ranking": 3199
        },
        {
            "id": 301,
            "rarity": 64,
            "type": "treeFrog(8)",
            "ranking": 3200
        },
        {
            "id": 305,
            "rarity": 64,
            "type": "treeFrog(4)",
            "ranking": 3201
        },
        {
            "id": 356,
            "rarity": 64,
            "type": "treeFrog(6)",
            "ranking": 3202
        },
        {
            "id": 576,
            "rarity": 64,
            "type": "grayTreeFrog",
            "ranking": 3203
        },
        {
            "id": 600,
            "rarity": 64,
            "type": "treeFrog(4)",
            "ranking": 3204
        },
        {
            "id": 659,
            "rarity": 64,
            "type": "greenTreeFrog",
            "ranking": 3205
        },
        {
            "id": 766,
            "rarity": 64,
            "type": "treeFrog(7)",
            "ranking": 3206
        },
        {
            "id": 859,
            "rarity": 64,
            "type": "grayTreeFrog",
            "ranking": 3207
        },
        {
            "id": 922,
            "rarity": 64,
            "type": "treeFrog(5)",
            "ranking": 3208
        },
        {
            "id": 971,
            "rarity": 64,
            "type": "grayTreeFrog",
            "ranking": 3209
        },
        {
            "id": 983,
            "rarity": 64,
            "type": "goldenDartFrog",
            "ranking": 3210
        },
        {
            "id": 1022,
            "rarity": 64,
            "type": "blueTreeFrog",
            "ranking": 3211
        },
        {
            "id": 1082,
            "rarity": 64,
            "type": "goldenDartFrog",
            "ranking": 3212
        },
        {
            "id": 1114,
            "rarity": 64,
            "type": "treeFrog(8)",
            "ranking": 3213
        },
        {
            "id": 1130,
            "rarity": 64,
            "type": "treeFrog(4)",
            "ranking": 3214
        },
        {
            "id": 1199,
            "rarity": 64,
            "type": "treeFrog(7)",
            "ranking": 3215
        },
        {
            "id": 1238,
            "rarity": 64,
            "type": "treeFrog(5)",
            "ranking": 3216
        },
        {
            "id": 1304,
            "rarity": 64,
            "type": "treeFrog(8)",
            "ranking": 3217
        },
        {
            "id": 1372,
            "rarity": 64,
            "type": "treeFrog(8)",
            "ranking": 3218
        },
        {
            "id": 1411,
            "rarity": 64,
            "type": "treeFrog(8)",
            "ranking": 3219
        },
        {
            "id": 1433,
            "rarity": 64,
            "type": "treeFrog(5)",
            "ranking": 3220
        },
        {
            "id": 1539,
            "rarity": 64,
            "type": "treeFrog(5)",
            "ranking": 3221
        },
        {
            "id": 1699,
            "rarity": 64,
            "type": "tomatoFrog",
            "ranking": 3222
        },
        {
            "id": 1736,
            "rarity": 64,
            "type": "treeFrog(4)",
            "ranking": 3223
        },
        {
            "id": 1742,
            "rarity": 64,
            "type": "treeFrog(7)",
            "ranking": 3224
        },
        {
            "id": 1843,
            "rarity": 64,
            "type": "unknown",
            "ranking": 3225
        },
        {
            "id": 1875,
            "rarity": 64,
            "type": "pinkTreeFrog",
            "ranking": 3226
        },
        {
            "id": 1889,
            "rarity": 64,
            "type": "treeFrog(6)",
            "ranking": 3227
        },
        {
            "id": 1931,
            "rarity": 64,
            "type": "blueTreeFrog",
            "ranking": 3228
        },
        {
            "id": 1952,
            "rarity": 64,
            "type": "goldenDartFrog",
            "ranking": 3229
        },
        {
            "id": 2022,
            "rarity": 64,
            "type": "greenTreeFrog",
            "ranking": 3230
        },
        {
            "id": 2058,
            "rarity": 64,
            "type": "greenTreeFrog",
            "ranking": 3231
        },
        {
            "id": 2138,
            "rarity": 64,
            "type": "treeFrog(5)",
            "ranking": 3232
        },
        {
            "id": 2161,
            "rarity": 64,
            "type": "redEyedTreeFrog",
            "ranking": 3233
        },
        {
            "id": 2168,
            "rarity": 64,
            "type": "unknown",
            "ranking": 3234
        },
        {
            "id": 2212,
            "rarity": 64,
            "type": "treeFrog(6)",
            "ranking": 3235
        },
        {
            "id": 2457,
            "rarity": 64,
            "type": "blueDartFrog",
            "ranking": 3236
        },
        {
            "id": 2465,
            "rarity": 64,
            "type": "treeFrog(6)",
            "ranking": 3237
        },
        {
            "id": 2510,
            "rarity": 64,
            "type": "blueTreeFrog",
            "ranking": 3238
        },
        {
            "id": 2524,
            "rarity": 64,
            "type": "treeFrog(3)",
            "ranking": 3239
        },
        {
            "id": 2537,
            "rarity": 64,
            "type": "treeFrog(7)",
            "ranking": 3240
        },
        {
            "id": 2611,
            "rarity": 64,
            "type": "unknown",
            "ranking": 3241
        },
        {
            "id": 2686,
            "rarity": 64,
            "type": "greenTreeFrog",
            "ranking": 3242
        },
        {
            "id": 2824,
            "rarity": 64,
            "type": "treeFrog(4)",
            "ranking": 3243
        },
        {
            "id": 2976,
            "rarity": 64,
            "type": "treeFrog(8)",
            "ranking": 3244
        },
        {
            "id": 3101,
            "rarity": 64,
            "type": "treeFrog(3)",
            "ranking": 3245
        },
        {
            "id": 3198,
            "rarity": 64,
            "type": "blueTreeFrog",
            "ranking": 3246
        },
        {
            "id": 3226,
            "rarity": 64,
            "type": "treeFrog(4)",
            "ranking": 3247
        },
        {
            "id": 3534,
            "rarity": 64,
            "type": "unknown",
            "ranking": 3248
        },
        {
            "id": 3550,
            "rarity": 64,
            "type": "tomatoFrog",
            "ranking": 3249
        },
        {
            "id": 3608,
            "rarity": 64,
            "type": "goldenDartFrog",
            "ranking": 3250
        },
        {
            "id": 3647,
            "rarity": 64,
            "type": "treeFrog(7)",
            "ranking": 3251
        },
        {
            "id": 3694,
            "rarity": 64,
            "type": "stawberryDartFrog",
            "ranking": 3252
        },
        {
            "id": 3721,
            "rarity": 64,
            "type": "tomatoFrog",
            "ranking": 3253
        },
        {
            "id": 3760,
            "rarity": 64,
            "type": "treeFrog(5)",
            "ranking": 3254
        },
        {
            "id": 3845,
            "rarity": 64,
            "type": "treeFrog(6)",
            "ranking": 3255
        },
        {
            "id": 3982,
            "rarity": 64,
            "type": "treeFrog(5)",
            "ranking": 3256
        },
        {
            "id": 4007,
            "rarity": 64,
            "type": "redEyedTreeFrog",
            "ranking": 3257
        },
        {
            "id": 56,
            "rarity": 63,
            "type": "treeFrog(3)",
            "ranking": 3258
        },
        {
            "id": 146,
            "rarity": 63,
            "type": "redEyedTreeFrog",
            "ranking": 3259
        },
        {
            "id": 159,
            "rarity": 63,
            "type": "unknown",
            "ranking": 3260
        },
        {
            "id": 374,
            "rarity": 63,
            "type": "treeFrog(7)",
            "ranking": 3261
        },
        {
            "id": 379,
            "rarity": 63,
            "type": "treeFrog(7)",
            "ranking": 3262
        },
        {
            "id": 401,
            "rarity": 63,
            "type": "treeFrog(3)",
            "ranking": 3263
        },
        {
            "id": 597,
            "rarity": 63,
            "type": "treeFrog(4)",
            "ranking": 3264
        },
        {
            "id": 599,
            "rarity": 63,
            "type": "treeFrog(8)",
            "ranking": 3265
        },
        {
            "id": 611,
            "rarity": 63,
            "type": "blueTreeFrog",
            "ranking": 3266
        },
        {
            "id": 615,
            "rarity": 63,
            "type": "treeFrog(3)",
            "ranking": 3267
        },
        {
            "id": 806,
            "rarity": 63,
            "type": "tomatoFrog",
            "ranking": 3268
        },
        {
            "id": 819,
            "rarity": 63,
            "type": "treeFrog(6)",
            "ranking": 3269
        },
        {
            "id": 833,
            "rarity": 63,
            "type": "treeFrog(8)",
            "ranking": 3270
        },
        {
            "id": 880,
            "rarity": 63,
            "type": "treeFrog(4)",
            "ranking": 3271
        },
        {
            "id": 927,
            "rarity": 63,
            "type": "tomatoFrog",
            "ranking": 3272
        },
        {
            "id": 972,
            "rarity": 63,
            "type": "treeFrog(5)",
            "ranking": 3273
        },
        {
            "id": 992,
            "rarity": 63,
            "type": "treeFrog(7)",
            "ranking": 3274
        },
        {
            "id": 1005,
            "rarity": 63,
            "type": "treeFrog(8)",
            "ranking": 3275
        },
        {
            "id": 1049,
            "rarity": 63,
            "type": "redEyedTreeFrog",
            "ranking": 3276
        },
        {
            "id": 1094,
            "rarity": 63,
            "type": "treeFrog(7)",
            "ranking": 3277
        },
        {
            "id": 1104,
            "rarity": 63,
            "type": "treeFrog(6)",
            "ranking": 3278
        },
        {
            "id": 1211,
            "rarity": 63,
            "type": "treeFrog(3)",
            "ranking": 3279
        },
        {
            "id": 1262,
            "rarity": 63,
            "type": "treeFrog(7)",
            "ranking": 3280
        },
        {
            "id": 1395,
            "rarity": 63,
            "type": "treeFrog(4)",
            "ranking": 3281
        },
        {
            "id": 1501,
            "rarity": 63,
            "type": "treeFrog(2)",
            "ranking": 3282
        },
        {
            "id": 1518,
            "rarity": 63,
            "type": "tomatoFrog",
            "ranking": 3283
        },
        {
            "id": 1521,
            "rarity": 63,
            "type": "greenTreeFrog",
            "ranking": 3284
        },
        {
            "id": 1680,
            "rarity": 63,
            "type": "treeFrog(3)",
            "ranking": 3285
        },
        {
            "id": 1762,
            "rarity": 63,
            "type": "treeFrog(5)",
            "ranking": 3286
        },
        {
            "id": 1809,
            "rarity": 63,
            "type": "goldenDartFrog",
            "ranking": 3287
        },
        {
            "id": 1958,
            "rarity": 63,
            "type": "unknown",
            "ranking": 3288
        },
        {
            "id": 1963,
            "rarity": 63,
            "type": "blueTreeFrog",
            "ranking": 3289
        },
        {
            "id": 2089,
            "rarity": 63,
            "type": "treeFrog(7)",
            "ranking": 3290
        },
        {
            "id": 2139,
            "rarity": 63,
            "type": "redEyedTreeFrog",
            "ranking": 3291
        },
        {
            "id": 2153,
            "rarity": 63,
            "type": "treeFrog(7)",
            "ranking": 3292
        },
        {
            "id": 2309,
            "rarity": 63,
            "type": "grayTreeFrog",
            "ranking": 3293
        },
        {
            "id": 2347,
            "rarity": 63,
            "type": "treeFrog(8)",
            "ranking": 3294
        },
        {
            "id": 2397,
            "rarity": 63,
            "type": "treeFrog(3)",
            "ranking": 3295
        },
        {
            "id": 2461,
            "rarity": 63,
            "type": "treeFrog(7)",
            "ranking": 3296
        },
        {
            "id": 2489,
            "rarity": 63,
            "type": "grayTreeFrog",
            "ranking": 3297
        },
        {
            "id": 2495,
            "rarity": 63,
            "type": "treeFrog(6)",
            "ranking": 3298
        },
        {
            "id": 2507,
            "rarity": 63,
            "type": "grayTreeFrog",
            "ranking": 3299
        },
        {
            "id": 2517,
            "rarity": 63,
            "type": "goldenDartFrog",
            "ranking": 3300
        },
        {
            "id": 2571,
            "rarity": 63,
            "type": "treeFrog(7)",
            "ranking": 3301
        },
        {
            "id": 2617,
            "rarity": 63,
            "type": "treeFrog(2)",
            "ranking": 3302
        },
        {
            "id": 2623,
            "rarity": 63,
            "type": "treeFrog(7)",
            "ranking": 3303
        },
        {
            "id": 2635,
            "rarity": 63,
            "type": "treeFrog(7)",
            "ranking": 3304
        },
        {
            "id": 2829,
            "rarity": 63,
            "type": "goldenDartFrog",
            "ranking": 3305
        },
        {
            "id": 2867,
            "rarity": 63,
            "type": "treeFrog(3)",
            "ranking": 3306
        },
        {
            "id": 2885,
            "rarity": 63,
            "type": "unknown",
            "ranking": 3307
        },
        {
            "id": 2895,
            "rarity": 63,
            "type": "treeFrog(3)",
            "ranking": 3308
        },
        {
            "id": 3164,
            "rarity": 63,
            "type": "grayTreeFrog",
            "ranking": 3309
        },
        {
            "id": 3168,
            "rarity": 63,
            "type": "treeFrog(3)",
            "ranking": 3310
        },
        {
            "id": 3271,
            "rarity": 63,
            "type": "treeFrog(6)",
            "ranking": 3311
        },
        {
            "id": 3277,
            "rarity": 63,
            "type": "treeFrog(4)",
            "ranking": 3312
        },
        {
            "id": 3287,
            "rarity": 63,
            "type": "treeFrog(8)",
            "ranking": 3313
        },
        {
            "id": 3300,
            "rarity": 63,
            "type": "grayTreeFrog",
            "ranking": 3314
        },
        {
            "id": 3314,
            "rarity": 63,
            "type": "tomatoFrog",
            "ranking": 3315
        },
        {
            "id": 3357,
            "rarity": 63,
            "type": "treeFrog(6)",
            "ranking": 3316
        },
        {
            "id": 3365,
            "rarity": 63,
            "type": "treeFrog(7)",
            "ranking": 3317
        },
        {
            "id": 3439,
            "rarity": 63,
            "type": "blueTreeFrog",
            "ranking": 3318
        },
        {
            "id": 3509,
            "rarity": 63,
            "type": "treeFrog(8)",
            "ranking": 3319
        },
        {
            "id": 3539,
            "rarity": 63,
            "type": "treeFrog(6)",
            "ranking": 3320
        },
        {
            "id": 3557,
            "rarity": 63,
            "type": "treeFrog(6)",
            "ranking": 3321
        },
        {
            "id": 3601,
            "rarity": 63,
            "type": "grayTreeFrog",
            "ranking": 3322
        },
        {
            "id": 3648,
            "rarity": 63,
            "type": "tomatoFrog",
            "ranking": 3323
        },
        {
            "id": 3650,
            "rarity": 63,
            "type": "treeFrog(3)",
            "ranking": 3324
        },
        {
            "id": 3665,
            "rarity": 63,
            "type": "treeFrog(3)",
            "ranking": 3325
        },
        {
            "id": 3669,
            "rarity": 63,
            "type": "treeFrog(4)",
            "ranking": 3326
        },
        {
            "id": 3706,
            "rarity": 63,
            "type": "redEyedTreeFrog",
            "ranking": 3327
        },
        {
            "id": 3758,
            "rarity": 63,
            "type": "tomatoFrog",
            "ranking": 3328
        },
        {
            "id": 3849,
            "rarity": 63,
            "type": "greenTreeFrog",
            "ranking": 3329
        },
        {
            "id": 3886,
            "rarity": 63,
            "type": "greenTreeFrog",
            "ranking": 3330
        },
        {
            "id": 3896,
            "rarity": 63,
            "type": "treeFrog(4)",
            "ranking": 3331
        },
        {
            "id": 3941,
            "rarity": 63,
            "type": "treeFrog(5)",
            "ranking": 3332
        },
        {
            "id": 62,
            "rarity": 62,
            "type": "treeFrog(3)",
            "ranking": 3333
        },
        {
            "id": 68,
            "rarity": 62,
            "type": "greenTreeFrog",
            "ranking": 3334
        },
        {
            "id": 123,
            "rarity": 62,
            "type": "treeFrog(4)",
            "ranking": 3335
        },
        {
            "id": 177,
            "rarity": 62,
            "type": "treeFrog(7)",
            "ranking": 3336
        },
        {
            "id": 194,
            "rarity": 62,
            "type": "cyanTreeFrog",
            "ranking": 3337
        },
        {
            "id": 247,
            "rarity": 62,
            "type": "treeFrog(8)",
            "ranking": 3338
        },
        {
            "id": 278,
            "rarity": 62,
            "type": "treeFrog(6)",
            "ranking": 3339
        },
        {
            "id": 280,
            "rarity": 62,
            "type": "grayTreeFrog",
            "ranking": 3340
        },
        {
            "id": 291,
            "rarity": 62,
            "type": "blueTreeFrog",
            "ranking": 3341
        },
        {
            "id": 293,
            "rarity": 62,
            "type": "treeFrog(7)",
            "ranking": 3342
        },
        {
            "id": 299,
            "rarity": 62,
            "type": "treeFrog(6)",
            "ranking": 3343
        },
        {
            "id": 307,
            "rarity": 62,
            "type": "brownTreeFrog",
            "ranking": 3344
        },
        {
            "id": 551,
            "rarity": 62,
            "type": "treeFrog(4)",
            "ranking": 3345
        },
        {
            "id": 622,
            "rarity": 62,
            "type": "treeFrog(8)",
            "ranking": 3346
        },
        {
            "id": 666,
            "rarity": 62,
            "type": "treeFrog(6)",
            "ranking": 3347
        },
        {
            "id": 697,
            "rarity": 62,
            "type": "treeFrog(5)",
            "ranking": 3348
        },
        {
            "id": 722,
            "rarity": 62,
            "type": "redEyedTreeFrog",
            "ranking": 3349
        },
        {
            "id": 727,
            "rarity": 62,
            "type": "goldenDartFrog",
            "ranking": 3350
        },
        {
            "id": 902,
            "rarity": 62,
            "type": "treeFrog(7)",
            "ranking": 3351
        },
        {
            "id": 955,
            "rarity": 62,
            "type": "treeFrog(6)",
            "ranking": 3352
        },
        {
            "id": 965,
            "rarity": 62,
            "type": "treeFrog(3)",
            "ranking": 3353
        },
        {
            "id": 989,
            "rarity": 62,
            "type": "greenTreeFrog",
            "ranking": 3354
        },
        {
            "id": 997,
            "rarity": 62,
            "type": "treeFrog(4)",
            "ranking": 3355
        },
        {
            "id": 1038,
            "rarity": 62,
            "type": "treeFrog(7)",
            "ranking": 3356
        },
        {
            "id": 1064,
            "rarity": 62,
            "type": "blueTreeFrog",
            "ranking": 3357
        },
        {
            "id": 1112,
            "rarity": 62,
            "type": "treeFrog(8)",
            "ranking": 3358
        },
        {
            "id": 1220,
            "rarity": 62,
            "type": "treeFrog(3)",
            "ranking": 3359
        },
        {
            "id": 1230,
            "rarity": 62,
            "type": "treeFrog(8)",
            "ranking": 3360
        },
        {
            "id": 1284,
            "rarity": 62,
            "type": "treeFrog(5)",
            "ranking": 3361
        },
        {
            "id": 1305,
            "rarity": 62,
            "type": "treeFrog(4)",
            "ranking": 3362
        },
        {
            "id": 1475,
            "rarity": 62,
            "type": "treeFrog(8)",
            "ranking": 3363
        },
        {
            "id": 1480,
            "rarity": 62,
            "type": "unknown",
            "ranking": 3364
        },
        {
            "id": 1508,
            "rarity": 62,
            "type": "treeFrog(8)",
            "ranking": 3365
        },
        {
            "id": 1513,
            "rarity": 62,
            "type": "greenTreeFrog",
            "ranking": 3366
        },
        {
            "id": 1537,
            "rarity": 62,
            "type": "treeFrog(7)",
            "ranking": 3367
        },
        {
            "id": 1592,
            "rarity": 62,
            "type": "lightBrownTreeFrog",
            "ranking": 3368
        },
        {
            "id": 1613,
            "rarity": 62,
            "type": "treeFrog(8)",
            "ranking": 3369
        },
        {
            "id": 1617,
            "rarity": 62,
            "type": "treeFrog(4)",
            "ranking": 3370
        },
        {
            "id": 1620,
            "rarity": 62,
            "type": "brownTreeFrog",
            "ranking": 3371
        },
        {
            "id": 1635,
            "rarity": 62,
            "type": "treeFrog(8)",
            "ranking": 3372
        },
        {
            "id": 1660,
            "rarity": 62,
            "type": "treeFrog(4)",
            "ranking": 3373
        },
        {
            "id": 1672,
            "rarity": 62,
            "type": "treeFrog(2)",
            "ranking": 3374
        },
        {
            "id": 1682,
            "rarity": 62,
            "type": "tomatoFrog",
            "ranking": 3375
        },
        {
            "id": 1688,
            "rarity": 62,
            "type": "treeFrog(6)",
            "ranking": 3376
        },
        {
            "id": 1706,
            "rarity": 62,
            "type": "cyanTreeFrog",
            "ranking": 3377
        },
        {
            "id": 1795,
            "rarity": 62,
            "type": "goldenDartFrog",
            "ranking": 3378
        },
        {
            "id": 1930,
            "rarity": 62,
            "type": "blueTreeFrog",
            "ranking": 3379
        },
        {
            "id": 1978,
            "rarity": 62,
            "type": "unknown",
            "ranking": 3380
        },
        {
            "id": 2083,
            "rarity": 62,
            "type": "treeFrog(4)",
            "ranking": 3381
        },
        {
            "id": 2173,
            "rarity": 62,
            "type": "greenTreeFrog",
            "ranking": 3382
        },
        {
            "id": 2178,
            "rarity": 62,
            "type": "unknown",
            "ranking": 3383
        },
        {
            "id": 2287,
            "rarity": 62,
            "type": "lightBrownTreeFrog",
            "ranking": 3384
        },
        {
            "id": 2471,
            "rarity": 62,
            "type": "unknown",
            "ranking": 3385
        },
        {
            "id": 2533,
            "rarity": 62,
            "type": "goldenDartFrog",
            "ranking": 3386
        },
        {
            "id": 2565,
            "rarity": 62,
            "type": "treeFrog(8)",
            "ranking": 3387
        },
        {
            "id": 2691,
            "rarity": 62,
            "type": "blueTreeFrog",
            "ranking": 3388
        },
        {
            "id": 2753,
            "rarity": 62,
            "type": "treeFrog(5)",
            "ranking": 3389
        },
        {
            "id": 2777,
            "rarity": 62,
            "type": "unknown",
            "ranking": 3390
        },
        {
            "id": 2788,
            "rarity": 62,
            "type": "blueTreeFrog",
            "ranking": 3391
        },
        {
            "id": 2793,
            "rarity": 62,
            "type": "treeFrog(6)",
            "ranking": 3392
        },
        {
            "id": 2876,
            "rarity": 62,
            "type": "treeFrog(6)",
            "ranking": 3393
        },
        {
            "id": 2968,
            "rarity": 62,
            "type": "unknown",
            "ranking": 3394
        },
        {
            "id": 3107,
            "rarity": 62,
            "type": "treeFrog(2)",
            "ranking": 3395
        },
        {
            "id": 3124,
            "rarity": 62,
            "type": "treeFrog(8)",
            "ranking": 3396
        },
        {
            "id": 3307,
            "rarity": 62,
            "type": "goldenDartFrog",
            "ranking": 3397
        },
        {
            "id": 3350,
            "rarity": 62,
            "type": "goldenDartFrog",
            "ranking": 3398
        },
        {
            "id": 3371,
            "rarity": 62,
            "type": "treeFrog(8)",
            "ranking": 3399
        },
        {
            "id": 3505,
            "rarity": 62,
            "type": "greenTreeFrog",
            "ranking": 3400
        },
        {
            "id": 3514,
            "rarity": 62,
            "type": "goldenDartFrog",
            "ranking": 3401
        },
        {
            "id": 3515,
            "rarity": 62,
            "type": "treeFrog(3)",
            "ranking": 3402
        },
        {
            "id": 3604,
            "rarity": 62,
            "type": "redEyedTreeFrog",
            "ranking": 3403
        },
        {
            "id": 3644,
            "rarity": 62,
            "type": "redEyedTreeFrog",
            "ranking": 3404
        },
        {
            "id": 3747,
            "rarity": 62,
            "type": "blueTreeFrog",
            "ranking": 3405
        },
        {
            "id": 3808,
            "rarity": 62,
            "type": "treeFrog(5)",
            "ranking": 3406
        },
        {
            "id": 3837,
            "rarity": 62,
            "type": "treeFrog(7)",
            "ranking": 3407
        },
        {
            "id": 3926,
            "rarity": 62,
            "type": "greenTreeFrog",
            "ranking": 3408
        },
        {
            "id": 3939,
            "rarity": 62,
            "type": "treeFrog(3)",
            "ranking": 3409
        },
        {
            "id": 3993,
            "rarity": 62,
            "type": "treeFrog(7)",
            "ranking": 3410
        },
        {
            "id": 4036,
            "rarity": 62,
            "type": "treeFrog(7)",
            "ranking": 3411
        },
        {
            "id": 18,
            "rarity": 61,
            "type": "treeFrog(3)",
            "ranking": 3412
        },
        {
            "id": 287,
            "rarity": 61,
            "type": "cyanTreeFrog",
            "ranking": 3413
        },
        {
            "id": 447,
            "rarity": 61,
            "type": "treeFrog(5)",
            "ranking": 3414
        },
        {
            "id": 484,
            "rarity": 61,
            "type": "redEyedTreeFrog",
            "ranking": 3415
        },
        {
            "id": 624,
            "rarity": 61,
            "type": "cyanTreeFrog",
            "ranking": 3416
        },
        {
            "id": 654,
            "rarity": 61,
            "type": "treeFrog(5)",
            "ranking": 3417
        },
        {
            "id": 710,
            "rarity": 61,
            "type": "treeFrog(2)",
            "ranking": 3418
        },
        {
            "id": 747,
            "rarity": 61,
            "type": "treeFrog(4)",
            "ranking": 3419
        },
        {
            "id": 856,
            "rarity": 61,
            "type": "treeFrog(8)",
            "ranking": 3420
        },
        {
            "id": 867,
            "rarity": 61,
            "type": "treeFrog(8)",
            "ranking": 3421
        },
        {
            "id": 893,
            "rarity": 61,
            "type": "lightBrownTreeFrog",
            "ranking": 3422
        },
        {
            "id": 903,
            "rarity": 61,
            "type": "treeFrog(4)",
            "ranking": 3423
        },
        {
            "id": 959,
            "rarity": 61,
            "type": "treeFrog(7)",
            "ranking": 3424
        },
        {
            "id": 1180,
            "rarity": 61,
            "type": "treeFrog(6)",
            "ranking": 3425
        },
        {
            "id": 1250,
            "rarity": 61,
            "type": "blueTreeFrog",
            "ranking": 3426
        },
        {
            "id": 1318,
            "rarity": 61,
            "type": "treeFrog(4)",
            "ranking": 3427
        },
        {
            "id": 1397,
            "rarity": 61,
            "type": "treeFrog(4)",
            "ranking": 3428
        },
        {
            "id": 1398,
            "rarity": 61,
            "type": "treeFrog(4)",
            "ranking": 3429
        },
        {
            "id": 1576,
            "rarity": 61,
            "type": "treeFrog(6)",
            "ranking": 3430
        },
        {
            "id": 1792,
            "rarity": 61,
            "type": "goldenDartFrog",
            "ranking": 3431
        },
        {
            "id": 1803,
            "rarity": 61,
            "type": "treeFrog(5)",
            "ranking": 3432
        },
        {
            "id": 1986,
            "rarity": 61,
            "type": "treeFrog(7)",
            "ranking": 3433
        },
        {
            "id": 2065,
            "rarity": 61,
            "type": "redEyedTreeFrog",
            "ranking": 3434
        },
        {
            "id": 2133,
            "rarity": 61,
            "type": "unknown",
            "ranking": 3435
        },
        {
            "id": 2151,
            "rarity": 61,
            "type": "treeFrog(5)",
            "ranking": 3436
        },
        {
            "id": 2218,
            "rarity": 61,
            "type": "cyanTreeFrog",
            "ranking": 3437
        },
        {
            "id": 2231,
            "rarity": 61,
            "type": "treeFrog(7)",
            "ranking": 3438
        },
        {
            "id": 2255,
            "rarity": 61,
            "type": "treeFrog(4)",
            "ranking": 3439
        },
        {
            "id": 2388,
            "rarity": 61,
            "type": "treeFrog(6)",
            "ranking": 3440
        },
        {
            "id": 2450,
            "rarity": 61,
            "type": "treeFrog(6)",
            "ranking": 3441
        },
        {
            "id": 2483,
            "rarity": 61,
            "type": "treeFrog(4)",
            "ranking": 3442
        },
        {
            "id": 2568,
            "rarity": 61,
            "type": "treeFrog(7)",
            "ranking": 3443
        },
        {
            "id": 2583,
            "rarity": 61,
            "type": "treeFrog(8)",
            "ranking": 3444
        },
        {
            "id": 2602,
            "rarity": 61,
            "type": "treeFrog(7)",
            "ranking": 3445
        },
        {
            "id": 2620,
            "rarity": 61,
            "type": "treeFrog(6)",
            "ranking": 3446
        },
        {
            "id": 2640,
            "rarity": 61,
            "type": "treeFrog(7)",
            "ranking": 3447
        },
        {
            "id": 2878,
            "rarity": 61,
            "type": "redEyedTreeFrog",
            "ranking": 3448
        },
        {
            "id": 2948,
            "rarity": 61,
            "type": "treeFrog(7)",
            "ranking": 3449
        },
        {
            "id": 2979,
            "rarity": 61,
            "type": "treeFrog(2)",
            "ranking": 3450
        },
        {
            "id": 3052,
            "rarity": 61,
            "type": "treeFrog(3)",
            "ranking": 3451
        },
        {
            "id": 3116,
            "rarity": 61,
            "type": "treeFrog(5)",
            "ranking": 3452
        },
        {
            "id": 3152,
            "rarity": 61,
            "type": "treeFrog(4)",
            "ranking": 3453
        },
        {
            "id": 3179,
            "rarity": 61,
            "type": "brownTreeFrog",
            "ranking": 3454
        },
        {
            "id": 3238,
            "rarity": 61,
            "type": "redEyedTreeFrog",
            "ranking": 3455
        },
        {
            "id": 3305,
            "rarity": 61,
            "type": "treeFrog(7)",
            "ranking": 3456
        },
        {
            "id": 3404,
            "rarity": 61,
            "type": "treeFrog(7)",
            "ranking": 3457
        },
        {
            "id": 3492,
            "rarity": 61,
            "type": "greenTreeFrog",
            "ranking": 3458
        },
        {
            "id": 3684,
            "rarity": 61,
            "type": "treeFrog(8)",
            "ranking": 3459
        },
        {
            "id": 3793,
            "rarity": 61,
            "type": "redEyedTreeFrog",
            "ranking": 3460
        },
        {
            "id": 3835,
            "rarity": 61,
            "type": "treeFrog(5)",
            "ranking": 3461
        },
        {
            "id": 3853,
            "rarity": 61,
            "type": "lightBrownTreeFrog",
            "ranking": 3462
        },
        {
            "id": 3861,
            "rarity": 61,
            "type": "redEyedTreeFrog",
            "ranking": 3463
        },
        {
            "id": 3892,
            "rarity": 61,
            "type": "brownTreeFrog",
            "ranking": 3464
        },
        {
            "id": 3914,
            "rarity": 61,
            "type": "treeFrog(3)",
            "ranking": 3465
        },
        {
            "id": 3999,
            "rarity": 61,
            "type": "treeFrog(4)",
            "ranking": 3466
        },
        {
            "id": 4031,
            "rarity": 61,
            "type": "treeFrog(6)",
            "ranking": 3467
        },
        {
            "id": 27,
            "rarity": 60,
            "type": "treeFrog(7)",
            "ranking": 3468
        },
        {
            "id": 166,
            "rarity": 60,
            "type": "treeFrog(3)",
            "ranking": 3469
        },
        {
            "id": 232,
            "rarity": 60,
            "type": "treeFrog(4)",
            "ranking": 3470
        },
        {
            "id": 262,
            "rarity": 60,
            "type": "treeFrog(5)",
            "ranking": 3471
        },
        {
            "id": 331,
            "rarity": 60,
            "type": "treeFrog(3)",
            "ranking": 3472
        },
        {
            "id": 432,
            "rarity": 60,
            "type": "treeFrog(5)",
            "ranking": 3473
        },
        {
            "id": 658,
            "rarity": 60,
            "type": "cyanTreeFrog",
            "ranking": 3474
        },
        {
            "id": 889,
            "rarity": 60,
            "type": "brownTreeFrog",
            "ranking": 3475
        },
        {
            "id": 1004,
            "rarity": 60,
            "type": "treeFrog(5)",
            "ranking": 3476
        },
        {
            "id": 1036,
            "rarity": 60,
            "type": "treeFrog(3)",
            "ranking": 3477
        },
        {
            "id": 1062,
            "rarity": 60,
            "type": "treeFrog(4)",
            "ranking": 3478
        },
        {
            "id": 1260,
            "rarity": 60,
            "type": "treeFrog(8)",
            "ranking": 3479
        },
        {
            "id": 1297,
            "rarity": 60,
            "type": "treeFrog(5)",
            "ranking": 3480
        },
        {
            "id": 1298,
            "rarity": 60,
            "type": "cyanTreeFrog",
            "ranking": 3481
        },
        {
            "id": 1423,
            "rarity": 60,
            "type": "brownTreeFrog",
            "ranking": 3482
        },
        {
            "id": 1429,
            "rarity": 60,
            "type": "treeFrog(8)",
            "ranking": 3483
        },
        {
            "id": 1459,
            "rarity": 60,
            "type": "treeFrog(6)",
            "ranking": 3484
        },
        {
            "id": 1570,
            "rarity": 60,
            "type": "lightBrownTreeFrog",
            "ranking": 3485
        },
        {
            "id": 1573,
            "rarity": 60,
            "type": "treeFrog(7)",
            "ranking": 3486
        },
        {
            "id": 1575,
            "rarity": 60,
            "type": "treeFrog(4)",
            "ranking": 3487
        },
        {
            "id": 1589,
            "rarity": 60,
            "type": "brownTreeFrog",
            "ranking": 3488
        },
        {
            "id": 1605,
            "rarity": 60,
            "type": "treeFrog(4)",
            "ranking": 3489
        },
        {
            "id": 1608,
            "rarity": 60,
            "type": "treeFrog(5)",
            "ranking": 3490
        },
        {
            "id": 1748,
            "rarity": 60,
            "type": "treeFrog(7)",
            "ranking": 3491
        },
        {
            "id": 1802,
            "rarity": 60,
            "type": "treeFrog(4)",
            "ranking": 3492
        },
        {
            "id": 1805,
            "rarity": 60,
            "type": "treeFrog(8)",
            "ranking": 3493
        },
        {
            "id": 1894,
            "rarity": 60,
            "type": "treeFrog(4)",
            "ranking": 3494
        },
        {
            "id": 1896,
            "rarity": 60,
            "type": "treeFrog(2)",
            "ranking": 3495
        },
        {
            "id": 1937,
            "rarity": 60,
            "type": "lightBrownTreeFrog",
            "ranking": 3496
        },
        {
            "id": 1967,
            "rarity": 60,
            "type": "lightBrownTreeFrog",
            "ranking": 3497
        },
        {
            "id": 2004,
            "rarity": 60,
            "type": "brownTreeFrog",
            "ranking": 3498
        },
        {
            "id": 2007,
            "rarity": 60,
            "type": "treeFrog(8)",
            "ranking": 3499
        },
        {
            "id": 2032,
            "rarity": 60,
            "type": "treeFrog(7)",
            "ranking": 3500
        },
        {
            "id": 2155,
            "rarity": 60,
            "type": "treeFrog(6)",
            "ranking": 3501
        },
        {
            "id": 2235,
            "rarity": 60,
            "type": "treeFrog(7)",
            "ranking": 3502
        },
        {
            "id": 2282,
            "rarity": 60,
            "type": "treeFrog(4)",
            "ranking": 3503
        },
        {
            "id": 2414,
            "rarity": 60,
            "type": "treeFrog(5)",
            "ranking": 3504
        },
        {
            "id": 2470,
            "rarity": 60,
            "type": "cyanTreeFrog",
            "ranking": 3505
        },
        {
            "id": 2574,
            "rarity": 60,
            "type": "lightBrownTreeFrog",
            "ranking": 3506
        },
        {
            "id": 2783,
            "rarity": 60,
            "type": "treeFrog(5)",
            "ranking": 3507
        },
        {
            "id": 2835,
            "rarity": 60,
            "type": "treeFrog(6)",
            "ranking": 3508
        },
        {
            "id": 2905,
            "rarity": 60,
            "type": "treeFrog(4)",
            "ranking": 3509
        },
        {
            "id": 3002,
            "rarity": 60,
            "type": "treeFrog(7)",
            "ranking": 3510
        },
        {
            "id": 3017,
            "rarity": 60,
            "type": "treeFrog(4)",
            "ranking": 3511
        },
        {
            "id": 3279,
            "rarity": 60,
            "type": "cyanTreeFrog",
            "ranking": 3512
        },
        {
            "id": 3295,
            "rarity": 60,
            "type": "redEyedTreeFrog",
            "ranking": 3513
        },
        {
            "id": 3473,
            "rarity": 60,
            "type": "treeFrog(8)",
            "ranking": 3514
        },
        {
            "id": 3609,
            "rarity": 60,
            "type": "treeFrog(8)",
            "ranking": 3515
        },
        {
            "id": 3615,
            "rarity": 60,
            "type": "treeFrog(8)",
            "ranking": 3516
        },
        {
            "id": 3679,
            "rarity": 60,
            "type": "treeFrog(7)",
            "ranking": 3517
        },
        {
            "id": 3757,
            "rarity": 60,
            "type": "treeFrog(7)",
            "ranking": 3518
        },
        {
            "id": 3851,
            "rarity": 60,
            "type": "treeFrog(4)",
            "ranking": 3519
        },
        {
            "id": 3935,
            "rarity": 60,
            "type": "treeFrog(5)",
            "ranking": 3520
        },
        {
            "id": 100,
            "rarity": 59,
            "type": "treeFrog(5)",
            "ranking": 3521
        },
        {
            "id": 124,
            "rarity": 59,
            "type": "lightBrownTreeFrog",
            "ranking": 3522
        },
        {
            "id": 162,
            "rarity": 59,
            "type": "treeFrog(7)",
            "ranking": 3523
        },
        {
            "id": 270,
            "rarity": 59,
            "type": "treeFrog(6)",
            "ranking": 3524
        },
        {
            "id": 330,
            "rarity": 59,
            "type": "treeFrog(8)",
            "ranking": 3525
        },
        {
            "id": 350,
            "rarity": 59,
            "type": "treeFrog(4)",
            "ranking": 3526
        },
        {
            "id": 397,
            "rarity": 59,
            "type": "treeFrog(4)",
            "ranking": 3527
        },
        {
            "id": 405,
            "rarity": 59,
            "type": "treeFrog(7)",
            "ranking": 3528
        },
        {
            "id": 450,
            "rarity": 59,
            "type": "treeFrog(8)",
            "ranking": 3529
        },
        {
            "id": 568,
            "rarity": 59,
            "type": "treeFrog(6)",
            "ranking": 3530
        },
        {
            "id": 861,
            "rarity": 59,
            "type": "cyanTreeFrog",
            "ranking": 3531
        },
        {
            "id": 961,
            "rarity": 59,
            "type": "treeFrog(8)",
            "ranking": 3532
        },
        {
            "id": 1003,
            "rarity": 59,
            "type": "treeFrog(6)",
            "ranking": 3533
        },
        {
            "id": 1045,
            "rarity": 59,
            "type": "treeFrog(5)",
            "ranking": 3534
        },
        {
            "id": 1079,
            "rarity": 59,
            "type": "cyanTreeFrog",
            "ranking": 3535
        },
        {
            "id": 1181,
            "rarity": 59,
            "type": "treeFrog(4)",
            "ranking": 3536
        },
        {
            "id": 1320,
            "rarity": 59,
            "type": "lightBrownTreeFrog",
            "ranking": 3537
        },
        {
            "id": 1721,
            "rarity": 59,
            "type": "brownTreeFrog",
            "ranking": 3538
        },
        {
            "id": 1817,
            "rarity": 59,
            "type": "treeFrog(4)",
            "ranking": 3539
        },
        {
            "id": 2018,
            "rarity": 59,
            "type": "brownTreeFrog",
            "ranking": 3540
        },
        {
            "id": 2048,
            "rarity": 59,
            "type": "treeFrog(4)",
            "ranking": 3541
        },
        {
            "id": 2241,
            "rarity": 59,
            "type": "treeFrog(4)",
            "ranking": 3542
        },
        {
            "id": 2456,
            "rarity": 59,
            "type": "treeFrog(6)",
            "ranking": 3543
        },
        {
            "id": 2548,
            "rarity": 59,
            "type": "treeFrog(6)",
            "ranking": 3544
        },
        {
            "id": 2791,
            "rarity": 59,
            "type": "brownTreeFrog",
            "ranking": 3545
        },
        {
            "id": 2796,
            "rarity": 59,
            "type": "treeFrog(4)",
            "ranking": 3546
        },
        {
            "id": 2820,
            "rarity": 59,
            "type": "treeFrog(6)",
            "ranking": 3547
        },
        {
            "id": 2866,
            "rarity": 59,
            "type": "treeFrog(5)",
            "ranking": 3548
        },
        {
            "id": 2924,
            "rarity": 59,
            "type": "treeFrog(8)",
            "ranking": 3549
        },
        {
            "id": 2947,
            "rarity": 59,
            "type": "treeFrog(6)",
            "ranking": 3550
        },
        {
            "id": 2991,
            "rarity": 59,
            "type": "treeFrog(8)",
            "ranking": 3551
        },
        {
            "id": 3013,
            "rarity": 59,
            "type": "lightBrownTreeFrog",
            "ranking": 3552
        },
        {
            "id": 3095,
            "rarity": 59,
            "type": "treeFrog(5)",
            "ranking": 3553
        },
        {
            "id": 3327,
            "rarity": 59,
            "type": "treeFrog(6)",
            "ranking": 3554
        },
        {
            "id": 3328,
            "rarity": 59,
            "type": "treeFrog(7)",
            "ranking": 3555
        },
        {
            "id": 3677,
            "rarity": 59,
            "type": "treeFrog(8)",
            "ranking": 3556
        },
        {
            "id": 3734,
            "rarity": 59,
            "type": "treeFrog(4)",
            "ranking": 3557
        },
        {
            "id": 3750,
            "rarity": 59,
            "type": "treeFrog(5)",
            "ranking": 3558
        },
        {
            "id": 3781,
            "rarity": 59,
            "type": "cyanTreeFrog",
            "ranking": 3559
        },
        {
            "id": 3797,
            "rarity": 59,
            "type": "treeFrog(8)",
            "ranking": 3560
        },
        {
            "id": 3917,
            "rarity": 59,
            "type": "treeFrog(8)",
            "ranking": 3561
        },
        {
            "id": 3942,
            "rarity": 59,
            "type": "treeFrog(5)",
            "ranking": 3562
        },
        {
            "id": 6,
            "rarity": 58,
            "type": "treeFrog(5)",
            "ranking": 3563
        },
        {
            "id": 15,
            "rarity": 58,
            "type": "treeFrog(5)",
            "ranking": 3564
        },
        {
            "id": 168,
            "rarity": 58,
            "type": "treeFrog(5)",
            "ranking": 3565
        },
        {
            "id": 213,
            "rarity": 58,
            "type": "treeFrog(6)",
            "ranking": 3566
        },
        {
            "id": 286,
            "rarity": 58,
            "type": "cyanTreeFrog",
            "ranking": 3567
        },
        {
            "id": 335,
            "rarity": 58,
            "type": "treeFrog(8)",
            "ranking": 3568
        },
        {
            "id": 340,
            "rarity": 58,
            "type": "treeFrog(5)",
            "ranking": 3569
        },
        {
            "id": 419,
            "rarity": 58,
            "type": "cyanTreeFrog",
            "ranking": 3570
        },
        {
            "id": 420,
            "rarity": 58,
            "type": "cyanTreeFrog",
            "ranking": 3571
        },
        {
            "id": 491,
            "rarity": 58,
            "type": "treeFrog(6)",
            "ranking": 3572
        },
        {
            "id": 518,
            "rarity": 58,
            "type": "brownTreeFrog",
            "ranking": 3573
        },
        {
            "id": 716,
            "rarity": 58,
            "type": "treeFrog(5)",
            "ranking": 3574
        },
        {
            "id": 945,
            "rarity": 58,
            "type": "treeFrog(7)",
            "ranking": 3575
        },
        {
            "id": 1011,
            "rarity": 58,
            "type": "cyanTreeFrog",
            "ranking": 3576
        },
        {
            "id": 1115,
            "rarity": 58,
            "type": "treeFrog(5)",
            "ranking": 3577
        },
        {
            "id": 1246,
            "rarity": 58,
            "type": "lightBrownTreeFrog",
            "ranking": 3578
        },
        {
            "id": 1324,
            "rarity": 58,
            "type": "treeFrog(5)",
            "ranking": 3579
        },
        {
            "id": 1514,
            "rarity": 58,
            "type": "treeFrog(5)",
            "ranking": 3580
        },
        {
            "id": 1542,
            "rarity": 58,
            "type": "treeFrog(8)",
            "ranking": 3581
        },
        {
            "id": 1629,
            "rarity": 58,
            "type": "brownTreeFrog",
            "ranking": 3582
        },
        {
            "id": 1695,
            "rarity": 58,
            "type": "treeFrog(3)",
            "ranking": 3583
        },
        {
            "id": 1725,
            "rarity": 58,
            "type": "treeFrog(6)",
            "ranking": 3584
        },
        {
            "id": 1757,
            "rarity": 58,
            "type": "brownTreeFrog",
            "ranking": 3585
        },
        {
            "id": 1775,
            "rarity": 58,
            "type": "treeFrog(3)",
            "ranking": 3586
        },
        {
            "id": 1796,
            "rarity": 58,
            "type": "lightBrownTreeFrog",
            "ranking": 3587
        },
        {
            "id": 1872,
            "rarity": 58,
            "type": "treeFrog(7)",
            "ranking": 3588
        },
        {
            "id": 2121,
            "rarity": 58,
            "type": "lightBrownTreeFrog",
            "ranking": 3589
        },
        {
            "id": 2556,
            "rarity": 58,
            "type": "treeFrog(7)",
            "ranking": 3590
        },
        {
            "id": 2575,
            "rarity": 58,
            "type": "treeFrog(4)",
            "ranking": 3591
        },
        {
            "id": 2576,
            "rarity": 58,
            "type": "treeFrog(5)",
            "ranking": 3592
        },
        {
            "id": 2627,
            "rarity": 58,
            "type": "treeFrog(8)",
            "ranking": 3593
        },
        {
            "id": 2666,
            "rarity": 58,
            "type": "treeFrog(6)",
            "ranking": 3594
        },
        {
            "id": 2675,
            "rarity": 58,
            "type": "lightBrownTreeFrog",
            "ranking": 3595
        },
        {
            "id": 2726,
            "rarity": 58,
            "type": "treeFrog(7)",
            "ranking": 3596
        },
        {
            "id": 2789,
            "rarity": 58,
            "type": "treeFrog(6)",
            "ranking": 3597
        },
        {
            "id": 2802,
            "rarity": 58,
            "type": "cyanTreeFrog",
            "ranking": 3598
        },
        {
            "id": 2897,
            "rarity": 58,
            "type": "treeFrog(3)",
            "ranking": 3599
        },
        {
            "id": 2915,
            "rarity": 58,
            "type": "treeFrog(7)",
            "ranking": 3600
        },
        {
            "id": 3050,
            "rarity": 58,
            "type": "treeFrog(8)",
            "ranking": 3601
        },
        {
            "id": 3076,
            "rarity": 58,
            "type": "brownTreeFrog",
            "ranking": 3602
        },
        {
            "id": 3085,
            "rarity": 58,
            "type": "treeFrog(6)",
            "ranking": 3603
        },
        {
            "id": 3103,
            "rarity": 58,
            "type": "treeFrog(5)",
            "ranking": 3604
        },
        {
            "id": 3117,
            "rarity": 58,
            "type": "brownTreeFrog",
            "ranking": 3605
        },
        {
            "id": 3243,
            "rarity": 58,
            "type": "treeFrog(5)",
            "ranking": 3606
        },
        {
            "id": 3369,
            "rarity": 58,
            "type": "cyanTreeFrog",
            "ranking": 3607
        },
        {
            "id": 3400,
            "rarity": 58,
            "type": "treeFrog(7)",
            "ranking": 3608
        },
        {
            "id": 3426,
            "rarity": 58,
            "type": "lightBrownTreeFrog",
            "ranking": 3609
        },
        {
            "id": 3445,
            "rarity": 58,
            "type": "treeFrog(4)",
            "ranking": 3610
        },
        {
            "id": 3467,
            "rarity": 58,
            "type": "lightBrownTreeFrog",
            "ranking": 3611
        },
        {
            "id": 3502,
            "rarity": 58,
            "type": "treeFrog(5)",
            "ranking": 3612
        },
        {
            "id": 3678,
            "rarity": 58,
            "type": "treeFrog(7)",
            "ranking": 3613
        },
        {
            "id": 3911,
            "rarity": 58,
            "type": "treeFrog(5)",
            "ranking": 3614
        },
        {
            "id": 3915,
            "rarity": 58,
            "type": "treeFrog(4)",
            "ranking": 3615
        },
        {
            "id": 3919,
            "rarity": 58,
            "type": "brownTreeFrog",
            "ranking": 3616
        },
        {
            "id": 325,
            "rarity": 57,
            "type": "treeFrog(7)",
            "ranking": 3617
        },
        {
            "id": 346,
            "rarity": 57,
            "type": "treeFrog(5)",
            "ranking": 3618
        },
        {
            "id": 352,
            "rarity": 57,
            "type": "treeFrog(6)",
            "ranking": 3619
        },
        {
            "id": 465,
            "rarity": 57,
            "type": "treeFrog(7)",
            "ranking": 3620
        },
        {
            "id": 495,
            "rarity": 57,
            "type": "brownTreeFrog",
            "ranking": 3621
        },
        {
            "id": 517,
            "rarity": 57,
            "type": "treeFrog(8)",
            "ranking": 3622
        },
        {
            "id": 737,
            "rarity": 57,
            "type": "treeFrog(5)",
            "ranking": 3623
        },
        {
            "id": 812,
            "rarity": 57,
            "type": "treeFrog(6)",
            "ranking": 3624
        },
        {
            "id": 1027,
            "rarity": 57,
            "type": "treeFrog(8)",
            "ranking": 3625
        },
        {
            "id": 1374,
            "rarity": 57,
            "type": "treeFrog(6)",
            "ranking": 3626
        },
        {
            "id": 1519,
            "rarity": 57,
            "type": "treeFrog(7)",
            "ranking": 3627
        },
        {
            "id": 1548,
            "rarity": 57,
            "type": "treeFrog(7)",
            "ranking": 3628
        },
        {
            "id": 1569,
            "rarity": 57,
            "type": "treeFrog(3)",
            "ranking": 3629
        },
        {
            "id": 1609,
            "rarity": 57,
            "type": "cyanTreeFrog",
            "ranking": 3630
        },
        {
            "id": 1754,
            "rarity": 57,
            "type": "treeFrog(7)",
            "ranking": 3631
        },
        {
            "id": 1810,
            "rarity": 57,
            "type": "treeFrog(8)",
            "ranking": 3632
        },
        {
            "id": 1970,
            "rarity": 57,
            "type": "treeFrog(5)",
            "ranking": 3633
        },
        {
            "id": 2005,
            "rarity": 57,
            "type": "treeFrog(7)",
            "ranking": 3634
        },
        {
            "id": 2029,
            "rarity": 57,
            "type": "treeFrog(8)",
            "ranking": 3635
        },
        {
            "id": 2051,
            "rarity": 57,
            "type": "treeFrog(7)",
            "ranking": 3636
        },
        {
            "id": 2230,
            "rarity": 57,
            "type": "treeFrog(5)",
            "ranking": 3637
        },
        {
            "id": 2354,
            "rarity": 57,
            "type": "treeFrog(6)",
            "ranking": 3638
        },
        {
            "id": 2427,
            "rarity": 57,
            "type": "treeFrog(8)",
            "ranking": 3639
        },
        {
            "id": 2580,
            "rarity": 57,
            "type": "treeFrog(5)",
            "ranking": 3640
        },
        {
            "id": 2662,
            "rarity": 57,
            "type": "treeFrog(6)",
            "ranking": 3641
        },
        {
            "id": 2679,
            "rarity": 57,
            "type": "lightBrownTreeFrog",
            "ranking": 3642
        },
        {
            "id": 3080,
            "rarity": 57,
            "type": "treeFrog(6)",
            "ranking": 3643
        },
        {
            "id": 3083,
            "rarity": 57,
            "type": "treeFrog(8)",
            "ranking": 3644
        },
        {
            "id": 3207,
            "rarity": 57,
            "type": "treeFrog(8)",
            "ranking": 3645
        },
        {
            "id": 3290,
            "rarity": 57,
            "type": "treeFrog(6)",
            "ranking": 3646
        },
        {
            "id": 3340,
            "rarity": 57,
            "type": "treeFrog(8)",
            "ranking": 3647
        },
        {
            "id": 3384,
            "rarity": 57,
            "type": "treeFrog(4)",
            "ranking": 3648
        },
        {
            "id": 3484,
            "rarity": 57,
            "type": "treeFrog(6)",
            "ranking": 3649
        },
        {
            "id": 3485,
            "rarity": 57,
            "type": "treeFrog(8)",
            "ranking": 3650
        },
        {
            "id": 3516,
            "rarity": 57,
            "type": "treeFrog(7)",
            "ranking": 3651
        },
        {
            "id": 3540,
            "rarity": 57,
            "type": "treeFrog(6)",
            "ranking": 3652
        },
        {
            "id": 3783,
            "rarity": 57,
            "type": "treeFrog(5)",
            "ranking": 3653
        },
        {
            "id": 3843,
            "rarity": 57,
            "type": "treeFrog(4)",
            "ranking": 3654
        },
        {
            "id": 3907,
            "rarity": 57,
            "type": "treeFrog(3)",
            "ranking": 3655
        },
        {
            "id": 4021,
            "rarity": 57,
            "type": "treeFrog(8)",
            "ranking": 3656
        },
        {
            "id": 4026,
            "rarity": 57,
            "type": "treeFrog(5)",
            "ranking": 3657
        },
        {
            "id": 5,
            "rarity": 56,
            "type": "treeFrog(7)",
            "ranking": 3658
        },
        {
            "id": 170,
            "rarity": 56,
            "type": "treeFrog(7)",
            "ranking": 3659
        },
        {
            "id": 234,
            "rarity": 56,
            "type": "treeFrog(4)",
            "ranking": 3660
        },
        {
            "id": 289,
            "rarity": 56,
            "type": "treeFrog(5)",
            "ranking": 3661
        },
        {
            "id": 297,
            "rarity": 56,
            "type": "treeFrog(6)",
            "ranking": 3662
        },
        {
            "id": 418,
            "rarity": 56,
            "type": "treeFrog(7)",
            "ranking": 3663
        },
        {
            "id": 431,
            "rarity": 56,
            "type": "treeFrog(6)",
            "ranking": 3664
        },
        {
            "id": 473,
            "rarity": 56,
            "type": "treeFrog(4)",
            "ranking": 3665
        },
        {
            "id": 514,
            "rarity": 56,
            "type": "treeFrog(5)",
            "ranking": 3666
        },
        {
            "id": 1032,
            "rarity": 56,
            "type": "treeFrog(7)",
            "ranking": 3667
        },
        {
            "id": 1056,
            "rarity": 56,
            "type": "treeFrog(3)",
            "ranking": 3668
        },
        {
            "id": 1066,
            "rarity": 56,
            "type": "treeFrog(7)",
            "ranking": 3669
        },
        {
            "id": 1097,
            "rarity": 56,
            "type": "treeFrog(6)",
            "ranking": 3670
        },
        {
            "id": 1209,
            "rarity": 56,
            "type": "treeFrog(7)",
            "ranking": 3671
        },
        {
            "id": 1443,
            "rarity": 56,
            "type": "treeFrog(7)",
            "ranking": 3672
        },
        {
            "id": 1557,
            "rarity": 56,
            "type": "treeFrog(7)",
            "ranking": 3673
        },
        {
            "id": 1723,
            "rarity": 56,
            "type": "treeFrog(8)",
            "ranking": 3674
        },
        {
            "id": 1928,
            "rarity": 56,
            "type": "treeFrog(7)",
            "ranking": 3675
        },
        {
            "id": 1940,
            "rarity": 56,
            "type": "treeFrog(3)",
            "ranking": 3676
        },
        {
            "id": 2120,
            "rarity": 56,
            "type": "treeFrog(6)",
            "ranking": 3677
        },
        {
            "id": 2233,
            "rarity": 56,
            "type": "treeFrog(8)",
            "ranking": 3678
        },
        {
            "id": 2307,
            "rarity": 56,
            "type": "treeFrog(6)",
            "ranking": 3679
        },
        {
            "id": 2373,
            "rarity": 56,
            "type": "treeFrog(6)",
            "ranking": 3680
        },
        {
            "id": 2399,
            "rarity": 56,
            "type": "treeFrog(8)",
            "ranking": 3681
        },
        {
            "id": 2426,
            "rarity": 56,
            "type": "treeFrog(7)",
            "ranking": 3682
        },
        {
            "id": 2709,
            "rarity": 56,
            "type": "treeFrog(8)",
            "ranking": 3683
        },
        {
            "id": 2874,
            "rarity": 56,
            "type": "treeFrog(8)",
            "ranking": 3684
        },
        {
            "id": 2887,
            "rarity": 56,
            "type": "treeFrog(6)",
            "ranking": 3685
        },
        {
            "id": 3146,
            "rarity": 56,
            "type": "treeFrog(3)",
            "ranking": 3686
        },
        {
            "id": 3171,
            "rarity": 56,
            "type": "treeFrog(6)",
            "ranking": 3687
        },
        {
            "id": 3294,
            "rarity": 56,
            "type": "treeFrog(7)",
            "ranking": 3688
        },
        {
            "id": 3474,
            "rarity": 56,
            "type": "treeFrog(6)",
            "ranking": 3689
        },
        {
            "id": 3574,
            "rarity": 56,
            "type": "treeFrog(8)",
            "ranking": 3690
        },
        {
            "id": 3655,
            "rarity": 56,
            "type": "treeFrog(5)",
            "ranking": 3691
        },
        {
            "id": 3668,
            "rarity": 56,
            "type": "treeFrog(6)",
            "ranking": 3692
        },
        {
            "id": 3711,
            "rarity": 56,
            "type": "treeFrog(5)",
            "ranking": 3693
        },
        {
            "id": 3713,
            "rarity": 56,
            "type": "treeFrog(6)",
            "ranking": 3694
        },
        {
            "id": 3752,
            "rarity": 56,
            "type": "treeFrog(6)",
            "ranking": 3695
        },
        {
            "id": 3765,
            "rarity": 56,
            "type": "treeFrog(3)",
            "ranking": 3696
        },
        {
            "id": 3778,
            "rarity": 56,
            "type": "treeFrog(5)",
            "ranking": 3697
        },
        {
            "id": 3953,
            "rarity": 56,
            "type": "treeFrog(8)",
            "ranking": 3698
        },
        {
            "id": 3963,
            "rarity": 56,
            "type": "treeFrog(7)",
            "ranking": 3699
        },
        {
            "id": 26,
            "rarity": 55,
            "type": "treeFrog(7)",
            "ranking": 3700
        },
        {
            "id": 127,
            "rarity": 55,
            "type": "treeFrog(6)",
            "ranking": 3701
        },
        {
            "id": 632,
            "rarity": 55,
            "type": "treeFrog(7)",
            "ranking": 3702
        },
        {
            "id": 741,
            "rarity": 55,
            "type": "treeFrog(5)",
            "ranking": 3703
        },
        {
            "id": 835,
            "rarity": 55,
            "type": "treeFrog(5)",
            "ranking": 3704
        },
        {
            "id": 836,
            "rarity": 55,
            "type": "treeFrog(7)",
            "ranking": 3705
        },
        {
            "id": 984,
            "rarity": 55,
            "type": "treeFrog(4)",
            "ranking": 3706
        },
        {
            "id": 1107,
            "rarity": 55,
            "type": "treeFrog(6)",
            "ranking": 3707
        },
        {
            "id": 1144,
            "rarity": 55,
            "type": "treeFrog(6)",
            "ranking": 3708
        },
        {
            "id": 1192,
            "rarity": 55,
            "type": "treeFrog(6)",
            "ranking": 3709
        },
        {
            "id": 1217,
            "rarity": 55,
            "type": "treeFrog(8)",
            "ranking": 3710
        },
        {
            "id": 1285,
            "rarity": 55,
            "type": "treeFrog(7)",
            "ranking": 3711
        },
        {
            "id": 1306,
            "rarity": 55,
            "type": "treeFrog(7)",
            "ranking": 3712
        },
        {
            "id": 1402,
            "rarity": 55,
            "type": "treeFrog(6)",
            "ranking": 3713
        },
        {
            "id": 1414,
            "rarity": 55,
            "type": "treeFrog(8)",
            "ranking": 3714
        },
        {
            "id": 1431,
            "rarity": 55,
            "type": "treeFrog(7)",
            "ranking": 3715
        },
        {
            "id": 1579,
            "rarity": 55,
            "type": "treeFrog(6)",
            "ranking": 3716
        },
        {
            "id": 1779,
            "rarity": 55,
            "type": "treeFrog(7)",
            "ranking": 3717
        },
        {
            "id": 1782,
            "rarity": 55,
            "type": "treeFrog(6)",
            "ranking": 3718
        },
        {
            "id": 1901,
            "rarity": 55,
            "type": "treeFrog(7)",
            "ranking": 3719
        },
        {
            "id": 1946,
            "rarity": 55,
            "type": "treeFrog(8)",
            "ranking": 3720
        },
        {
            "id": 2128,
            "rarity": 55,
            "type": "treeFrog(7)",
            "ranking": 3721
        },
        {
            "id": 2134,
            "rarity": 55,
            "type": "treeFrog(6)",
            "ranking": 3722
        },
        {
            "id": 2141,
            "rarity": 55,
            "type": "treeFrog(6)",
            "ranking": 3723
        },
        {
            "id": 2294,
            "rarity": 55,
            "type": "treeFrog(7)",
            "ranking": 3724
        },
        {
            "id": 2352,
            "rarity": 55,
            "type": "treeFrog(8)",
            "ranking": 3725
        },
        {
            "id": 2412,
            "rarity": 55,
            "type": "treeFrog(6)",
            "ranking": 3726
        },
        {
            "id": 2432,
            "rarity": 55,
            "type": "treeFrog(8)",
            "ranking": 3727
        },
        {
            "id": 2592,
            "rarity": 55,
            "type": "treeFrog(8)",
            "ranking": 3728
        },
        {
            "id": 2656,
            "rarity": 55,
            "type": "treeFrog(4)",
            "ranking": 3729
        },
        {
            "id": 2809,
            "rarity": 55,
            "type": "treeFrog(4)",
            "ranking": 3730
        },
        {
            "id": 3035,
            "rarity": 55,
            "type": "treeFrog(7)",
            "ranking": 3731
        },
        {
            "id": 3133,
            "rarity": 55,
            "type": "treeFrog(6)",
            "ranking": 3732
        },
        {
            "id": 3184,
            "rarity": 55,
            "type": "treeFrog(7)",
            "ranking": 3733
        },
        {
            "id": 3347,
            "rarity": 55,
            "type": "treeFrog(8)",
            "ranking": 3734
        },
        {
            "id": 3360,
            "rarity": 55,
            "type": "treeFrog(6)",
            "ranking": 3735
        },
        {
            "id": 3522,
            "rarity": 55,
            "type": "treeFrog(8)",
            "ranking": 3736
        },
        {
            "id": 3672,
            "rarity": 55,
            "type": "treeFrog(6)",
            "ranking": 3737
        },
        {
            "id": 3775,
            "rarity": 55,
            "type": "treeFrog(6)",
            "ranking": 3738
        },
        {
            "id": 3965,
            "rarity": 55,
            "type": "treeFrog(8)",
            "ranking": 3739
        },
        {
            "id": 3,
            "rarity": 54,
            "type": "treeFrog(6)",
            "ranking": 3740
        },
        {
            "id": 55,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3741
        },
        {
            "id": 144,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3742
        },
        {
            "id": 176,
            "rarity": 54,
            "type": "treeFrog(8)",
            "ranking": 3743
        },
        {
            "id": 226,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3744
        },
        {
            "id": 253,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3745
        },
        {
            "id": 614,
            "rarity": 54,
            "type": "treeFrog(6)",
            "ranking": 3746
        },
        {
            "id": 639,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3747
        },
        {
            "id": 760,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3748
        },
        {
            "id": 792,
            "rarity": 54,
            "type": "treeFrog(8)",
            "ranking": 3749
        },
        {
            "id": 814,
            "rarity": 54,
            "type": "treeFrog(5)",
            "ranking": 3750
        },
        {
            "id": 932,
            "rarity": 54,
            "type": "treeFrog(8)",
            "ranking": 3751
        },
        {
            "id": 1023,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3752
        },
        {
            "id": 1095,
            "rarity": 54,
            "type": "treeFrog(8)",
            "ranking": 3753
        },
        {
            "id": 1174,
            "rarity": 54,
            "type": "treeFrog(5)",
            "ranking": 3754
        },
        {
            "id": 1448,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3755
        },
        {
            "id": 1467,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3756
        },
        {
            "id": 1502,
            "rarity": 54,
            "type": "treeFrog(6)",
            "ranking": 3757
        },
        {
            "id": 1585,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3758
        },
        {
            "id": 1610,
            "rarity": 54,
            "type": "treeFrog(8)",
            "ranking": 3759
        },
        {
            "id": 1639,
            "rarity": 54,
            "type": "treeFrog(6)",
            "ranking": 3760
        },
        {
            "id": 1647,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3761
        },
        {
            "id": 1819,
            "rarity": 54,
            "type": "treeFrog(8)",
            "ranking": 3762
        },
        {
            "id": 1897,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3763
        },
        {
            "id": 2170,
            "rarity": 54,
            "type": "treeFrog(6)",
            "ranking": 3764
        },
        {
            "id": 2226,
            "rarity": 54,
            "type": "treeFrog(8)",
            "ranking": 3765
        },
        {
            "id": 2359,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3766
        },
        {
            "id": 2503,
            "rarity": 54,
            "type": "treeFrog(6)",
            "ranking": 3767
        },
        {
            "id": 2526,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3768
        },
        {
            "id": 2557,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3769
        },
        {
            "id": 2681,
            "rarity": 54,
            "type": "treeFrog(6)",
            "ranking": 3770
        },
        {
            "id": 2857,
            "rarity": 54,
            "type": "treeFrog(6)",
            "ranking": 3771
        },
        {
            "id": 2859,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3772
        },
        {
            "id": 2868,
            "rarity": 54,
            "type": "treeFrog(8)",
            "ranking": 3773
        },
        {
            "id": 3096,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3774
        },
        {
            "id": 3282,
            "rarity": 54,
            "type": "treeFrog(8)",
            "ranking": 3775
        },
        {
            "id": 3285,
            "rarity": 54,
            "type": "treeFrog(6)",
            "ranking": 3776
        },
        {
            "id": 3450,
            "rarity": 54,
            "type": "treeFrog(6)",
            "ranking": 3777
        },
        {
            "id": 3454,
            "rarity": 54,
            "type": "treeFrog(7)",
            "ranking": 3778
        },
        {
            "id": 3548,
            "rarity": 54,
            "type": "treeFrog(6)",
            "ranking": 3779
        },
        {
            "id": 3790,
            "rarity": 54,
            "type": "treeFrog(8)",
            "ranking": 3780
        },
        {
            "id": 4028,
            "rarity": 54,
            "type": "treeFrog(4)",
            "ranking": 3781
        },
        {
            "id": 59,
            "rarity": 53,
            "type": "treeFrog(6)",
            "ranking": 3782
        },
        {
            "id": 265,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3783
        },
        {
            "id": 571,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3784
        },
        {
            "id": 832,
            "rarity": 53,
            "type": "treeFrog(7)",
            "ranking": 3785
        },
        {
            "id": 1042,
            "rarity": 53,
            "type": "treeFrog(6)",
            "ranking": 3786
        },
        {
            "id": 1244,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3787
        },
        {
            "id": 1258,
            "rarity": 53,
            "type": "treeFrog(4)",
            "ranking": 3788
        },
        {
            "id": 1273,
            "rarity": 53,
            "type": "treeFrog(4)",
            "ranking": 3789
        },
        {
            "id": 1308,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3790
        },
        {
            "id": 1341,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3791
        },
        {
            "id": 1373,
            "rarity": 53,
            "type": "treeFrog(6)",
            "ranking": 3792
        },
        {
            "id": 1385,
            "rarity": 53,
            "type": "treeFrog(4)",
            "ranking": 3793
        },
        {
            "id": 1887,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3794
        },
        {
            "id": 1944,
            "rarity": 53,
            "type": "treeFrog(7)",
            "ranking": 3795
        },
        {
            "id": 1979,
            "rarity": 53,
            "type": "treeFrog(5)",
            "ranking": 3796
        },
        {
            "id": 2112,
            "rarity": 53,
            "type": "treeFrog(7)",
            "ranking": 3797
        },
        {
            "id": 2346,
            "rarity": 53,
            "type": "treeFrog(7)",
            "ranking": 3798
        },
        {
            "id": 2520,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3799
        },
        {
            "id": 2672,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3800
        },
        {
            "id": 2758,
            "rarity": 53,
            "type": "treeFrog(7)",
            "ranking": 3801
        },
        {
            "id": 2761,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3802
        },
        {
            "id": 2945,
            "rarity": 53,
            "type": "treeFrog(7)",
            "ranking": 3803
        },
        {
            "id": 3119,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3804
        },
        {
            "id": 3122,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3805
        },
        {
            "id": 3319,
            "rarity": 53,
            "type": "treeFrog(6)",
            "ranking": 3806
        },
        {
            "id": 3353,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3807
        },
        {
            "id": 3392,
            "rarity": 53,
            "type": "treeFrog(4)",
            "ranking": 3808
        },
        {
            "id": 3598,
            "rarity": 53,
            "type": "treeFrog(7)",
            "ranking": 3809
        },
        {
            "id": 3693,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3810
        },
        {
            "id": 3701,
            "rarity": 53,
            "type": "treeFrog(6)",
            "ranking": 3811
        },
        {
            "id": 3735,
            "rarity": 53,
            "type": "treeFrog(5)",
            "ranking": 3812
        },
        {
            "id": 3739,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3813
        },
        {
            "id": 3759,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3814
        },
        {
            "id": 3773,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3815
        },
        {
            "id": 3776,
            "rarity": 53,
            "type": "treeFrog(6)",
            "ranking": 3816
        },
        {
            "id": 3806,
            "rarity": 53,
            "type": "treeFrog(4)",
            "ranking": 3817
        },
        {
            "id": 3881,
            "rarity": 53,
            "type": "treeFrog(5)",
            "ranking": 3818
        },
        {
            "id": 3924,
            "rarity": 53,
            "type": "treeFrog(8)",
            "ranking": 3819
        },
        {
            "id": 3987,
            "rarity": 53,
            "type": "treeFrog(4)",
            "ranking": 3820
        },
        {
            "id": 351,
            "rarity": 52,
            "type": "treeFrog(8)",
            "ranking": 3821
        },
        {
            "id": 353,
            "rarity": 52,
            "type": "treeFrog(6)",
            "ranking": 3822
        },
        {
            "id": 706,
            "rarity": 52,
            "type": "treeFrog(5)",
            "ranking": 3823
        },
        {
            "id": 730,
            "rarity": 52,
            "type": "treeFrog(8)",
            "ranking": 3824
        },
        {
            "id": 1078,
            "rarity": 52,
            "type": "treeFrog(7)",
            "ranking": 3825
        },
        {
            "id": 1266,
            "rarity": 52,
            "type": "treeFrog(8)",
            "ranking": 3826
        },
        {
            "id": 1347,
            "rarity": 52,
            "type": "treeFrog(8)",
            "ranking": 3827
        },
        {
            "id": 1399,
            "rarity": 52,
            "type": "treeFrog(7)",
            "ranking": 3828
        },
        {
            "id": 1403,
            "rarity": 52,
            "type": "treeFrog(6)",
            "ranking": 3829
        },
        {
            "id": 1495,
            "rarity": 52,
            "type": "treeFrog(7)",
            "ranking": 3830
        },
        {
            "id": 1546,
            "rarity": 52,
            "type": "treeFrog(4)",
            "ranking": 3831
        },
        {
            "id": 1598,
            "rarity": 52,
            "type": "treeFrog(7)",
            "ranking": 3832
        },
        {
            "id": 2224,
            "rarity": 52,
            "type": "treeFrog(7)",
            "ranking": 3833
        },
        {
            "id": 2341,
            "rarity": 52,
            "type": "treeFrog(5)",
            "ranking": 3834
        },
        {
            "id": 2419,
            "rarity": 52,
            "type": "treeFrog(8)",
            "ranking": 3835
        },
        {
            "id": 2479,
            "rarity": 52,
            "type": "treeFrog(7)",
            "ranking": 3836
        },
        {
            "id": 3006,
            "rarity": 52,
            "type": "treeFrog(8)",
            "ranking": 3837
        },
        {
            "id": 3008,
            "rarity": 52,
            "type": "treeFrog(5)",
            "ranking": 3838
        },
        {
            "id": 3573,
            "rarity": 52,
            "type": "treeFrog(7)",
            "ranking": 3839
        },
        {
            "id": 3828,
            "rarity": 52,
            "type": "treeFrog(8)",
            "ranking": 3840
        },
        {
            "id": 3920,
            "rarity": 52,
            "type": "treeFrog(8)",
            "ranking": 3841
        },
        {
            "id": 3962,
            "rarity": 52,
            "type": "treeFrog(8)",
            "ranking": 3842
        },
        {
            "id": 3967,
            "rarity": 52,
            "type": "treeFrog(8)",
            "ranking": 3843
        },
        {
            "id": 134,
            "rarity": 51,
            "type": "treeFrog(6)",
            "ranking": 3844
        },
        {
            "id": 237,
            "rarity": 51,
            "type": "treeFrog(8)",
            "ranking": 3845
        },
        {
            "id": 254,
            "rarity": 51,
            "type": "treeFrog(8)",
            "ranking": 3846
        },
        {
            "id": 559,
            "rarity": 51,
            "type": "treeFrog(6)",
            "ranking": 3847
        },
        {
            "id": 734,
            "rarity": 51,
            "type": "treeFrog(8)",
            "ranking": 3848
        },
        {
            "id": 834,
            "rarity": 51,
            "type": "treeFrog(5)",
            "ranking": 3849
        },
        {
            "id": 900,
            "rarity": 51,
            "type": "treeFrog(8)",
            "ranking": 3850
        },
        {
            "id": 1279,
            "rarity": 51,
            "type": "treeFrog(8)",
            "ranking": 3851
        },
        {
            "id": 1412,
            "rarity": 51,
            "type": "treeFrog(8)",
            "ranking": 3852
        },
        {
            "id": 1534,
            "rarity": 51,
            "type": "treeFrog(7)",
            "ranking": 3853
        },
        {
            "id": 1594,
            "rarity": 51,
            "type": "treeFrog(5)",
            "ranking": 3854
        },
        {
            "id": 1918,
            "rarity": 51,
            "type": "treeFrog(7)",
            "ranking": 3855
        },
        {
            "id": 2324,
            "rarity": 51,
            "type": "treeFrog(7)",
            "ranking": 3856
        },
        {
            "id": 2569,
            "rarity": 51,
            "type": "treeFrog(5)",
            "ranking": 3857
        },
        {
            "id": 2916,
            "rarity": 51,
            "type": "treeFrog(6)",
            "ranking": 3858
        },
        {
            "id": 3589,
            "rarity": 51,
            "type": "treeFrog(8)",
            "ranking": 3859
        },
        {
            "id": 3770,
            "rarity": 51,
            "type": "treeFrog(5)",
            "ranking": 3860
        },
        {
            "id": 366,
            "rarity": 50,
            "type": "treeFrog(8)",
            "ranking": 3861
        },
        {
            "id": 522,
            "rarity": 50,
            "type": "treeFrog(5)",
            "ranking": 3862
        },
        {
            "id": 556,
            "rarity": 50,
            "type": "treeFrog(6)",
            "ranking": 3863
        },
        {
            "id": 1125,
            "rarity": 50,
            "type": "treeFrog(6)",
            "ranking": 3864
        },
        {
            "id": 1268,
            "rarity": 50,
            "type": "treeFrog(7)",
            "ranking": 3865
        },
        {
            "id": 1698,
            "rarity": 50,
            "type": "treeFrog(8)",
            "ranking": 3866
        },
        {
            "id": 2862,
            "rarity": 50,
            "type": "treeFrog(8)",
            "ranking": 3867
        },
        {
            "id": 3420,
            "rarity": 50,
            "type": "treeFrog(7)",
            "ranking": 3868
        },
        {
            "id": 3946,
            "rarity": 50,
            "type": "treeFrog(6)",
            "ranking": 3869
        },
        {
            "id": 70,
            "rarity": 49,
            "type": "treeFrog(7)",
            "ranking": 3870
        },
        {
            "id": 435,
            "rarity": 49,
            "type": "treeFrog(8)",
            "ranking": 3871
        },
        {
            "id": 675,
            "rarity": 49,
            "type": "treeFrog(6)",
            "ranking": 3872
        },
        {
            "id": 1726,
            "rarity": 49,
            "type": "treeFrog(6)",
            "ranking": 3873
        },
        {
            "id": 2285,
            "rarity": 49,
            "type": "treeFrog(8)",
            "ranking": 3874
        },
        {
            "id": 2443,
            "rarity": 49,
            "type": "treeFrog(6)",
            "ranking": 3875
        },
        {
            "id": 2653,
            "rarity": 49,
            "type": "treeFrog(7)",
            "ranking": 3876
        },
        {
            "id": 3003,
            "rarity": 49,
            "type": "treeFrog(7)",
            "ranking": 3877
        },
        {
            "id": 3624,
            "rarity": 49,
            "type": "treeFrog(8)",
            "ranking": 3878
        },
        {
            "id": 739,
            "rarity": 48,
            "type": "treeFrog(7)",
            "ranking": 3879
        },
        {
            "id": 848,
            "rarity": 48,
            "type": "treeFrog(6)",
            "ranking": 3880
        },
        {
            "id": 1224,
            "rarity": 48,
            "type": "treeFrog(6)",
            "ranking": 3881
        },
        {
            "id": 1560,
            "rarity": 48,
            "type": "treeFrog(7)",
            "ranking": 3882
        },
        {
            "id": 2360,
            "rarity": 48,
            "type": "treeFrog(6)",
            "ranking": 3883
        },
        {
            "id": 2952,
            "rarity": 48,
            "type": "treeFrog(8)",
            "ranking": 3884
        },
        {
            "id": 2971,
            "rarity": 48,
            "type": "treeFrog(6)",
            "ranking": 3885
        },
        {
            "id": 3112,
            "rarity": 48,
            "type": "treeFrog(6)",
            "ranking": 3886
        },
        {
            "id": 3216,
            "rarity": 48,
            "type": "treeFrog(8)",
            "ranking": 3887
        },
        {
            "id": 3249,
            "rarity": 48,
            "type": "treeFrog(7)",
            "ranking": 3888
        },
        {
            "id": 3257,
            "rarity": 48,
            "type": "treeFrog(8)",
            "ranking": 3889
        },
        {
            "id": 3458,
            "rarity": 48,
            "type": "treeFrog(2)",
            "ranking": 3890
        },
        {
            "id": 3654,
            "rarity": 48,
            "type": "treeFrog(8)",
            "ranking": 3891
        },
        {
            "id": 3822,
            "rarity": 48,
            "type": "treeFrog(2)",
            "ranking": 3892
        },
        {
            "id": 3954,
            "rarity": 48,
            "type": "treeFrog(6)",
            "ranking": 3893
        },
        {
            "id": 4,
            "rarity": 47,
            "type": "treeFrog(2)",
            "ranking": 3894
        },
        {
            "id": 79,
            "rarity": 47,
            "type": "treeFrog(2)",
            "ranking": 3895
        },
        {
            "id": 1257,
            "rarity": 47,
            "type": "treeFrog(7)",
            "ranking": 3896
        },
        {
            "id": 1325,
            "rarity": 47,
            "type": "treeFrog(7)",
            "ranking": 3897
        },
        {
            "id": 1446,
            "rarity": 47,
            "type": "treeFrog(7)",
            "ranking": 3898
        },
        {
            "id": 1611,
            "rarity": 47,
            "type": "treeFrog(7)",
            "ranking": 3899
        },
        {
            "id": 1638,
            "rarity": 47,
            "type": "treeFrog(8)",
            "ranking": 3900
        },
        {
            "id": 1788,
            "rarity": 47,
            "type": "treeFrog(6)",
            "ranking": 3901
        },
        {
            "id": 1856,
            "rarity": 47,
            "type": "treeFrog(7)",
            "ranking": 3902
        },
        {
            "id": 2003,
            "rarity": 47,
            "type": "treeFrog(8)",
            "ranking": 3903
        },
        {
            "id": 3984,
            "rarity": 47,
            "type": "treeFrog(8)",
            "ranking": 3904
        },
        {
            "id": 4029,
            "rarity": 47,
            "type": "treeFrog(2)",
            "ranking": 3905
        },
        {
            "id": 156,
            "rarity": 46,
            "type": "treeFrog(8)",
            "ranking": 3906
        },
        {
            "id": 294,
            "rarity": 46,
            "type": "treeFrog(8)",
            "ranking": 3907
        },
        {
            "id": 446,
            "rarity": 46,
            "type": "treeFrog(2)",
            "ranking": 3908
        },
        {
            "id": 1943,
            "rarity": 46,
            "type": "treeFrog(2)",
            "ranking": 3909
        },
        {
            "id": 2115,
            "rarity": 46,
            "type": "treeFrog(8)",
            "ranking": 3910
        },
        {
            "id": 2229,
            "rarity": 46,
            "type": "treeFrog(7)",
            "ranking": 3911
        },
        {
            "id": 2448,
            "rarity": 46,
            "type": "treeFrog(2)",
            "ranking": 3912
        },
        {
            "id": 2737,
            "rarity": 46,
            "type": "treeFrog(8)",
            "ranking": 3913
        },
        {
            "id": 2933,
            "rarity": 46,
            "type": "treeFrog(8)",
            "ranking": 3914
        },
        {
            "id": 3741,
            "rarity": 46,
            "type": "treeFrog(2)",
            "ranking": 3915
        },
        {
            "id": 587,
            "rarity": 45,
            "type": "treeFrog(2)",
            "ranking": 3916
        },
        {
            "id": 855,
            "rarity": 45,
            "type": "treeFrog(2)",
            "ranking": 3917
        },
        {
            "id": 2654,
            "rarity": 45,
            "type": "treeFrog(8)",
            "ranking": 3918
        },
        {
            "id": 3697,
            "rarity": 45,
            "type": "treeFrog(2)",
            "ranking": 3919
        },
        {
            "id": 607,
            "rarity": 44,
            "type": "treeFrog(2)",
            "ranking": 3920
        },
        {
            "id": 938,
            "rarity": 44,
            "type": "treeFrog(2)",
            "ranking": 3921
        },
        {
            "id": 1710,
            "rarity": 44,
            "type": "treeFrog(2)",
            "ranking": 3922
        },
        {
            "id": 2389,
            "rarity": 44,
            "type": "treeFrog(2)",
            "ranking": 3923
        },
        {
            "id": 2499,
            "rarity": 44,
            "type": "treeFrog(2)",
            "ranking": 3924
        },
        {
            "id": 3270,
            "rarity": 44,
            "type": "treeFrog(2)",
            "ranking": 3925
        },
        {
            "id": 1200,
            "rarity": 43,
            "type": "treeFrog(2)",
            "ranking": 3926
        },
        {
            "id": 1618,
            "rarity": 43,
            "type": "treeFrog(3)",
            "ranking": 3927
        },
        {
            "id": 2349,
            "rarity": 43,
            "type": "treeFrog(3)",
            "ranking": 3928
        },
        {
            "id": 2493,
            "rarity": 42,
            "type": "treeFrog(3)",
            "ranking": 3929
        },
        {
            "id": 3024,
            "rarity": 42,
            "type": "treeFrog(3)",
            "ranking": 3930
        },
        {
            "id": 3210,
            "rarity": 42,
            "type": "treeFrog(3)",
            "ranking": 3931
        },
        {
            "id": 358,
            "rarity": 41,
            "type": "treeFrog(3)",
            "ranking": 3932
        },
        {
            "id": 1171,
            "rarity": 41,
            "type": "treeFrog(3)",
            "ranking": 3933
        },
        {
            "id": 1406,
            "rarity": 41,
            "type": "treeFrog(3)",
            "ranking": 3934
        },
        {
            "id": 3316,
            "rarity": 41,
            "type": "treeFrog(3)",
            "ranking": 3935
        },
        {
            "id": 46,
            "rarity": 40,
            "type": "treeFrog(4)",
            "ranking": 3936
        },
        {
            "id": 1545,
            "rarity": 40,
            "type": "treeFrog(4)",
            "ranking": 3937
        },
        {
            "id": 2357,
            "rarity": 40,
            "type": "treeFrog(3)",
            "ranking": 3938
        },
        {
            "id": 2500,
            "rarity": 40,
            "type": "treeFrog(3)",
            "ranking": 3939
        },
        {
            "id": 2936,
            "rarity": 40,
            "type": "treeFrog(3)",
            "ranking": 3940
        },
        {
            "id": 757,
            "rarity": 39,
            "type": "treeFrog(4)",
            "ranking": 3941
        },
        {
            "id": 947,
            "rarity": 39,
            "type": "treeFrog(3)",
            "ranking": 3942
        },
        {
            "id": 1054,
            "rarity": 39,
            "type": "treeFrog(4)",
            "ranking": 3943
        },
        {
            "id": 1190,
            "rarity": 39,
            "type": "treeFrog(3)",
            "ranking": 3944
        },
        {
            "id": 2072,
            "rarity": 39,
            "type": "treeFrog(3)",
            "ranking": 3945
        },
        {
            "id": 2912,
            "rarity": 39,
            "type": "treeFrog(4)",
            "ranking": 3946
        },
        {
            "id": 3217,
            "rarity": 39,
            "type": "treeFrog(3)",
            "ranking": 3947
        },
        {
            "id": 3848,
            "rarity": 39,
            "type": "treeFrog(3)",
            "ranking": 3948
        },
        {
            "id": 3871,
            "rarity": 39,
            "type": "treeFrog(3)",
            "ranking": 3949
        },
        {
            "id": 130,
            "rarity": 38,
            "type": "treeFrog(4)",
            "ranking": 3950
        },
        {
            "id": 613,
            "rarity": 38,
            "type": "treeFrog(5)",
            "ranking": 3951
        },
        {
            "id": 1983,
            "rarity": 38,
            "type": "treeFrog(4)",
            "ranking": 3952
        },
        {
            "id": 2658,
            "rarity": 38,
            "type": "treeFrog(5)",
            "ranking": 3953
        },
        {
            "id": 2696,
            "rarity": 38,
            "type": "treeFrog(3)",
            "ranking": 3954
        },
        {
            "id": 3523,
            "rarity": 38,
            "type": "treeFrog(4)",
            "ranking": 3955
        },
        {
            "id": 3656,
            "rarity": 38,
            "type": "treeFrog(4)",
            "ranking": 3956
        },
        {
            "id": 382,
            "rarity": 37,
            "type": "treeFrog(4)",
            "ranking": 3957
        },
        {
            "id": 1764,
            "rarity": 37,
            "type": "treeFrog(5)",
            "ranking": 3958
        },
        {
            "id": 1783,
            "rarity": 37,
            "type": "treeFrog(4)",
            "ranking": 3959
        },
        {
            "id": 2808,
            "rarity": 37,
            "type": "treeFrog(4)",
            "ranking": 3960
        },
        {
            "id": 2928,
            "rarity": 37,
            "type": "treeFrog(5)",
            "ranking": 3961
        },
        {
            "id": 3587,
            "rarity": 37,
            "type": "treeFrog(5)",
            "ranking": 3962
        },
        {
            "id": 41,
            "rarity": 36,
            "type": "treeFrog(4)",
            "ranking": 3963
        },
        {
            "id": 393,
            "rarity": 36,
            "type": "treeFrog(4)",
            "ranking": 3964
        },
        {
            "id": 1002,
            "rarity": 36,
            "type": "treeFrog(4)",
            "ranking": 3965
        },
        {
            "id": 1267,
            "rarity": 36,
            "type": "treeFrog(5)",
            "ranking": 3966
        },
        {
            "id": 1772,
            "rarity": 36,
            "type": "treeFrog(5)",
            "ranking": 3967
        },
        {
            "id": 1822,
            "rarity": 36,
            "type": "treeFrog(4)",
            "ranking": 3968
        },
        {
            "id": 2025,
            "rarity": 36,
            "type": "treeFrog(4)",
            "ranking": 3969
        },
        {
            "id": 2207,
            "rarity": 36,
            "type": "treeFrog(5)",
            "ranking": 3970
        },
        {
            "id": 3403,
            "rarity": 36,
            "type": "treeFrog(5)",
            "ranking": 3971
        },
        {
            "id": 3719,
            "rarity": 36,
            "type": "treeFrog(4)",
            "ranking": 3972
        },
        {
            "id": 764,
            "rarity": 35,
            "type": "treeFrog(6)",
            "ranking": 3973
        },
        {
            "id": 1029,
            "rarity": 35,
            "type": "treeFrog(5)",
            "ranking": 3974
        },
        {
            "id": 1178,
            "rarity": 35,
            "type": "treeFrog(6)",
            "ranking": 3975
        },
        {
            "id": 1408,
            "rarity": 35,
            "type": "treeFrog(5)",
            "ranking": 3976
        },
        {
            "id": 2078,
            "rarity": 35,
            "type": "treeFrog(5)",
            "ranking": 3977
        },
        {
            "id": 2591,
            "rarity": 35,
            "type": "treeFrog(4)",
            "ranking": 3978
        },
        {
            "id": 471,
            "rarity": 34,
            "type": "treeFrog(5)",
            "ranking": 3979
        },
        {
            "id": 520,
            "rarity": 34,
            "type": "treeFrog(5)",
            "ranking": 3980
        },
        {
            "id": 617,
            "rarity": 34,
            "type": "treeFrog(7)",
            "ranking": 3981
        },
        {
            "id": 641,
            "rarity": 34,
            "type": "treeFrog(5)",
            "ranking": 3982
        },
        {
            "id": 825,
            "rarity": 34,
            "type": "treeFrog(5)",
            "ranking": 3983
        },
        {
            "id": 1117,
            "rarity": 34,
            "type": "treeFrog(6)",
            "ranking": 3984
        },
        {
            "id": 1221,
            "rarity": 34,
            "type": "treeFrog(7)",
            "ranking": 3985
        },
        {
            "id": 1593,
            "rarity": 34,
            "type": "treeFrog(6)",
            "ranking": 3986
        },
        {
            "id": 2296,
            "rarity": 34,
            "type": "treeFrog(5)",
            "ranking": 3987
        },
        {
            "id": 2336,
            "rarity": 34,
            "type": "treeFrog(5)",
            "ranking": 3988
        },
        {
            "id": 3692,
            "rarity": 34,
            "type": "treeFrog(6)",
            "ranking": 3989
        },
        {
            "id": 574,
            "rarity": 33,
            "type": "treeFrog(7)",
            "ranking": 3990
        },
        {
            "id": 634,
            "rarity": 33,
            "type": "treeFrog(7)",
            "ranking": 3991
        },
        {
            "id": 788,
            "rarity": 33,
            "type": "treeFrog(7)",
            "ranking": 3992
        },
        {
            "id": 809,
            "rarity": 33,
            "type": "treeFrog(6)",
            "ranking": 3993
        },
        {
            "id": 1015,
            "rarity": 33,
            "type": "treeFrog(5)",
            "ranking": 3994
        },
        {
            "id": 1254,
            "rarity": 33,
            "type": "treeFrog(8)",
            "ranking": 3995
        },
        {
            "id": 2462,
            "rarity": 33,
            "type": "treeFrog(6)",
            "ranking": 3996
        },
        {
            "id": 2613,
            "rarity": 33,
            "type": "treeFrog(6)",
            "ranking": 3997
        },
        {
            "id": 2770,
            "rarity": 33,
            "type": "treeFrog(6)",
            "ranking": 3998
        },
        {
            "id": 3092,
            "rarity": 33,
            "type": "treeFrog(8)",
            "ranking": 3999
        },
        {
            "id": 25,
            "rarity": 32,
            "type": "treeFrog(7)",
            "ranking": 4000
        },
        {
            "id": 279,
            "rarity": 32,
            "type": "treeFrog(8)",
            "ranking": 4001
        },
        {
            "id": 808,
            "rarity": 32,
            "type": "treeFrog(7)",
            "ranking": 4002
        },
        {
            "id": 2070,
            "rarity": 32,
            "type": "treeFrog(8)",
            "ranking": 4003
        },
        {
            "id": 2209,
            "rarity": 32,
            "type": "treeFrog(7)",
            "ranking": 4004
        },
        {
            "id": 2302,
            "rarity": 32,
            "type": "treeFrog(6)",
            "ranking": 4005
        },
        {
            "id": 2306,
            "rarity": 32,
            "type": "treeFrog(8)",
            "ranking": 4006
        },
        {
            "id": 2345,
            "rarity": 32,
            "type": "treeFrog(6)",
            "ranking": 4007
        },
        {
            "id": 2614,
            "rarity": 32,
            "type": "treeFrog(7)",
            "ranking": 4008
        },
        {
            "id": 3490,
            "rarity": 32,
            "type": "treeFrog(6)",
            "ranking": 4009
        },
        {
            "id": 324,
            "rarity": 31,
            "type": "treeFrog(8)",
            "ranking": 4010
        },
        {
            "id": 990,
            "rarity": 31,
            "type": "treeFrog(8)",
            "ranking": 4011
        },
        {
            "id": 1149,
            "rarity": 31,
            "type": "treeFrog(8)",
            "ranking": 4012
        },
        {
            "id": 1350,
            "rarity": 31,
            "type": "treeFrog(8)",
            "ranking": 4013
        },
        {
            "id": 2137,
            "rarity": 31,
            "type": "treeFrog(7)",
            "ranking": 4014
        },
        {
            "id": 2693,
            "rarity": 31,
            "type": "treeFrog(6)",
            "ranking": 4015
        },
        {
            "id": 2716,
            "rarity": 31,
            "type": "treeFrog(6)",
            "ranking": 4016
        },
        {
            "id": 3063,
            "rarity": 31,
            "type": "treeFrog(7)",
            "ranking": 4017
        },
        {
            "id": 3138,
            "rarity": 31,
            "type": "treeFrog(6)",
            "ranking": 4018
        },
        {
            "id": 3162,
            "rarity": 31,
            "type": "treeFrog(7)",
            "ranking": 4019
        },
        {
            "id": 3814,
            "rarity": 31,
            "type": "treeFrog(6)",
            "ranking": 4020
        },
        {
            "id": 3882,
            "rarity": 31,
            "type": "treeFrog(6)",
            "ranking": 4021
        },
        {
            "id": 3973,
            "rarity": 31,
            "type": "treeFrog(6)",
            "ranking": 4022
        },
        {
            "id": 504,
            "rarity": 30,
            "type": "treeFrog(7)",
            "ranking": 4023
        },
        {
            "id": 1184,
            "rarity": 30,
            "type": "treeFrog(7)",
            "ranking": 4024
        },
        {
            "id": 1474,
            "rarity": 30,
            "type": "treeFrog(7)",
            "ranking": 4025
        },
        {
            "id": 2091,
            "rarity": 30,
            "type": "treeFrog(8)",
            "ranking": 4026
        },
        {
            "id": 2747,
            "rarity": 30,
            "type": "treeFrog(7)",
            "ranking": 4027
        },
        {
            "id": 2806,
            "rarity": 30,
            "type": "treeFrog(7)",
            "ranking": 4028
        },
        {
            "id": 2951,
            "rarity": 30,
            "type": "treeFrog(8)",
            "ranking": 4029
        },
        {
            "id": 3230,
            "rarity": 30,
            "type": "treeFrog(6)",
            "ranking": 4030
        },
        {
            "id": 3367,
            "rarity": 30,
            "type": "treeFrog(7)",
            "ranking": 4031
        },
        {
            "id": 3785,
            "rarity": 30,
            "type": "treeFrog(8)",
            "ranking": 4032
        },
        {
            "id": 933,
            "rarity": 29,
            "type": "treeFrog(8)",
            "ranking": 4033
        },
        {
            "id": 1452,
            "rarity": 29,
            "type": "treeFrog(8)",
            "ranking": 4034
        },
        {
            "id": 2433,
            "rarity": 29,
            "type": "treeFrog(8)",
            "ranking": 4035
        },
        {
            "id": 2797,
            "rarity": 29,
            "type": "treeFrog(8)",
            "ranking": 4036
        },
        {
            "id": 3108,
            "rarity": 29,
            "type": "treeFrog(7)",
            "ranking": 4037
        },
        {
            "id": 3506,
            "rarity": 29,
            "type": "treeFrog(8)",
            "ranking": 4038
        },
        {
            "id": 3637,
            "rarity": 29,
            "type": "treeFrog(8)",
            "ranking": 4039
        },
        {
            "id": 1728,
            "rarity": 28,
            "type": "treeFrog(8)",
            "ranking": 4040
        }
    ]
    