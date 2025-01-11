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
    for (i = 1; i < 4041; i++) {
        
        console.log('-- Frog #'+i+' --')
        rarity_token_rankings[i] = { id: i, rarity: 1, type: '', };

        let metadata = await (await fetch('https://freshfrogs.github.io/frog/json/'+i+'.json')).json();
        for (let j = 0; j < metadata.attributes.length; j++) {
            var attribute = metadata.attributes[j].value;
            var trait_type = metadata.attributes[j].trait_type;

            // Frog Type
            if (trait_type == 'Frog' || trait_type == 'SpecialFrog') {
                var frog_type = attribute;
                rarity_token_rankings[i].type = attribute;
            }

            // Natural Trait Bonus
            if (attribute == 'natural' && trait_type == 'Trait') {
                if (frog_type == 'redEyedTreeFrog' || frog_type == 'lightBrownTreeFrog' || frog_type == 'brownTreeFrog' || frog_type == 'goldenDartFrog' || frog_type == 'unknown' || frog_type == 'grayTreeFrog' || frog_type == 'stawberryDartFrog' || frog_type == 'blueDartFrog' || frog_type == 'splendidLeafFrog') {

                    // Natural Rarity Score
                    var rarity_raw = parseInt(rarity_token_rankings[i].rarity) + 1/(parseInt(rarity_trait_rankings['rare_natural'])/4040)
                    rarity_token_rankings[i].rarity = parseInt(rarity_raw);

                    var rarity_raw = parseInt(rarity_token_rankings[i].rarity) + 1/(parseInt(rarity_trait_rankings['natural'])/4040)
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

    var ranked_tokens = rarity_token_rankings.sort(({rarity:a}, {rarity:b}) => b-a);
    console.log(ranked_tokens);
}



async function render_token_byrarity(batch, leftoff) {
    try{

        if(! leftoff) { leftoff = 0; }
        for (i = 0; i < batch; i++) {
            var frog = freshfrogs_rarity_rankings[i].id
            var rarity_rank = freshfrogs_rarity_rankings[i].rarity

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
                '<text class="card_text">'+'Ranking'+'</text>'+'<br>'+
                '<text class="card_bold"> No.'+i+'</text>'+
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
            "type": "peace"
        },
        {
            "id": 2917,
            "rarity": 271,
            "type": "peace"
        },
        {
            "id": 2071,
            "rarity": 270,
            "type": "peace"
        },
        {
            "id": 3339,
            "rarity": 268,
            "type": "peace"
        },
        {
            "id": 2113,
            "rarity": 266,
            "type": "peace"
        },
        {
            "id": 3780,
            "rarity": 266,
            "type": "peace"
        },
        {
            "id": 1968,
            "rarity": 265,
            "type": "peace"
        },
        {
            "id": 2452,
            "rarity": 262,
            "type": "peace"
        },
        {
            "id": 3318,
            "rarity": 261,
            "type": "peace"
        },
        {
            "id": 3153,
            "rarity": 259,
            "type": "peace"
        },
        {
            "id": 2819,
            "rarity": 246,
            "type": "peace"
        },
        {
            "id": 2179,
            "rarity": 244,
            "type": "peace"
        },
        {
            "id": 3093,
            "rarity": 243,
            "type": "peace"
        },
        {
            "id": 548,
            "rarity": 237,
            "type": "peace"
        },
        {
            "id": 1834,
            "rarity": 237,
            "type": "peace"
        },
        {
            "id": 2100,
            "rarity": 236,
            "type": "peace"
        },
        {
            "id": 3421,
            "rarity": 235,
            "type": "peace"
        },
        {
            "id": 3552,
            "rarity": 230,
            "type": "peace"
        },
        {
            "id": 2821,
            "rarity": 219,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3744,
            "rarity": 215,
            "type": "splendidLeafFrog"
        },
        {
            "id": 343,
            "rarity": 213,
            "type": "peace"
        },
        {
            "id": 1948,
            "rarity": 213,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3264,
            "rarity": 208,
            "type": "inversedEyes"
        },
        {
            "id": 1129,
            "rarity": 205,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1919,
            "rarity": 205,
            "type": "thirdEye"
        },
        {
            "id": 3111,
            "rarity": 205,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1228,
            "rarity": 204,
            "type": "inversedEyes"
        },
        {
            "id": 2101,
            "rarity": 202,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1483,
            "rarity": 200,
            "type": "grayTreeFrog"
        },
        {
            "id": 3868,
            "rarity": 200,
            "type": "stawberryDartFrog"
        },
        {
            "id": 3239,
            "rarity": 198,
            "type": "grayTreeFrog"
        },
        {
            "id": 818,
            "rarity": 195,
            "type": "grayTreeFrog"
        },
        {
            "id": 1486,
            "rarity": 195,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2657,
            "rarity": 195,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2858,
            "rarity": 195,
            "type": "brownTreeFrog"
        },
        {
            "id": 1624,
            "rarity": 194,
            "type": "goldenDartFrog"
        },
        {
            "id": 2219,
            "rarity": 194,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2545,
            "rarity": 191,
            "type": "closedEyes"
        },
        {
            "id": 3593,
            "rarity": 191,
            "type": "brownTreeFrog"
        },
        {
            "id": 1182,
            "rarity": 190,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3727,
            "rarity": 189,
            "type": "thirdEye"
        },
        {
            "id": 2429,
            "rarity": 182,
            "type": "greenTreeFrog"
        },
        {
            "id": 1201,
            "rarity": 179,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2832,
            "rarity": 179,
            "type": "splendidLeafFrog"
        },
        {
            "id": 2929,
            "rarity": 179,
            "type": "treeFrog(1)"
        },
        {
            "id": 3190,
            "rarity": 179,
            "type": "unknown"
        },
        {
            "id": 3606,
            "rarity": 179,
            "type": "inversedEyes"
        },
        {
            "id": 2873,
            "rarity": 178,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 782,
            "rarity": 177,
            "type": "stawberryDartFrog"
        },
        {
            "id": 963,
            "rarity": 176,
            "type": "treeFrog(1)"
        },
        {
            "id": 1021,
            "rarity": 176,
            "type": "thirdEye"
        },
        {
            "id": 1694,
            "rarity": 176,
            "type": "grayTreeFrog"
        },
        {
            "id": 2986,
            "rarity": 175,
            "type": "croaking"
        },
        {
            "id": 2411,
            "rarity": 174,
            "type": "closedEyes"
        },
        {
            "id": 2926,
            "rarity": 174,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3546,
            "rarity": 174,
            "type": "closedEyes"
        },
        {
            "id": 1213,
            "rarity": 172,
            "type": "thirdEye"
        },
        {
            "id": 3223,
            "rarity": 172,
            "type": "closedEyes"
        },
        {
            "id": 3930,
            "rarity": 172,
            "type": "inversedEyes"
        },
        {
            "id": 2281,
            "rarity": 171,
            "type": "blueTreeFrog"
        },
        {
            "id": 2581,
            "rarity": 171,
            "type": "grayTreeFrog"
        },
        {
            "id": 660,
            "rarity": 170,
            "type": "croaking"
        },
        {
            "id": 1755,
            "rarity": 170,
            "type": "brownTreeFrog"
        },
        {
            "id": 991,
            "rarity": 169,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 998,
            "rarity": 169,
            "type": "grayTreeFrog"
        },
        {
            "id": 1160,
            "rarity": 169,
            "type": "inversedEyes"
        },
        {
            "id": 2267,
            "rarity": 169,
            "type": "brownTreeFrog"
        },
        {
            "id": 303,
            "rarity": 168,
            "type": "croaking"
        },
        {
            "id": 564,
            "rarity": 168,
            "type": "goldenDartFrog"
        },
        {
            "id": 3723,
            "rarity": 168,
            "type": "blueTreeFrog"
        },
        {
            "id": 1401,
            "rarity": 167,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 51,
            "rarity": 166,
            "type": "stawberryDartFrog"
        },
        {
            "id": 338,
            "rarity": 166,
            "type": "brownTreeFrog"
        },
        {
            "id": 1161,
            "rarity": 166,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 50,
            "rarity": 165,
            "type": "inversedEyes"
        },
        {
            "id": 3865,
            "rarity": 165,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2228,
            "rarity": 164,
            "type": "croaking"
        },
        {
            "id": 2476,
            "rarity": 163,
            "type": "closedEyes"
        },
        {
            "id": 101,
            "rarity": 162,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1390,
            "rarity": 162,
            "type": "croaking"
        },
        {
            "id": 157,
            "rarity": 161,
            "type": "unknown"
        },
        {
            "id": 2300,
            "rarity": 161,
            "type": "inversedEyes"
        },
        {
            "id": 2369,
            "rarity": 161,
            "type": "inversedEyes"
        },
        {
            "id": 2054,
            "rarity": 159,
            "type": "thirdEye"
        },
        {
            "id": 3554,
            "rarity": 159,
            "type": "thirdEye"
        },
        {
            "id": 2844,
            "rarity": 158,
            "type": "croaking"
        },
        {
            "id": 3125,
            "rarity": 158,
            "type": "treeFrog(2)"
        },
        {
            "id": 1690,
            "rarity": 157,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3221,
            "rarity": 157,
            "type": "inversedEyes"
        },
        {
            "id": 1683,
            "rarity": 156,
            "type": "inversedEyes"
        },
        {
            "id": 2944,
            "rarity": 156,
            "type": "treeFrog(2)"
        },
        {
            "id": 536,
            "rarity": 155,
            "type": "inversedEyes"
        },
        {
            "id": 1034,
            "rarity": 155,
            "type": "croaking"
        },
        {
            "id": 1858,
            "rarity": 155,
            "type": "thirdEye"
        },
        {
            "id": 2881,
            "rarity": 155,
            "type": "inversedEyes"
        },
        {
            "id": 3033,
            "rarity": 155,
            "type": "croaking"
        },
        {
            "id": 347,
            "rarity": 154,
            "type": "inversedEyes"
        },
        {
            "id": 1077,
            "rarity": 154,
            "type": "thirdEye"
        },
        {
            "id": 1818,
            "rarity": 154,
            "type": "closedEyes"
        },
        {
            "id": 2729,
            "rarity": 154,
            "type": "inversedEyes"
        },
        {
            "id": 2800,
            "rarity": 154,
            "type": "inversedEyes"
        },
        {
            "id": 2970,
            "rarity": 154,
            "type": "orangeTreeFrog"
        },
        {
            "id": 719,
            "rarity": 153,
            "type": "thirdEye"
        },
        {
            "id": 1381,
            "rarity": 153,
            "type": "croaking"
        },
        {
            "id": 1456,
            "rarity": 153,
            "type": "inversedEyes"
        },
        {
            "id": 2919,
            "rarity": 153,
            "type": "thirdEye"
        },
        {
            "id": 1503,
            "rarity": 152,
            "type": "inversedEyes"
        },
        {
            "id": 1846,
            "rarity": 152,
            "type": "inversedEyes"
        },
        {
            "id": 2258,
            "rarity": 152,
            "type": "inversedEyes"
        },
        {
            "id": 2444,
            "rarity": 152,
            "type": "inversedEyes"
        },
        {
            "id": 2774,
            "rarity": 152,
            "type": "thirdEye"
        },
        {
            "id": 2949,
            "rarity": 152,
            "type": "inversedEyes"
        },
        {
            "id": 2984,
            "rarity": 152,
            "type": "thirdEye"
        },
        {
            "id": 3394,
            "rarity": 152,
            "type": "inversedEyes"
        },
        {
            "id": 3537,
            "rarity": 152,
            "type": "thirdEye"
        },
        {
            "id": 3958,
            "rarity": 152,
            "type": "treeFrog(1)"
        },
        {
            "id": 3996,
            "rarity": 152,
            "type": "inversedEyes"
        },
        {
            "id": 3998,
            "rarity": 152,
            "type": "inversedEyes"
        },
        {
            "id": 1014,
            "rarity": 151,
            "type": "croaking"
        },
        {
            "id": 2036,
            "rarity": 151,
            "type": "inversedEyes"
        },
        {
            "id": 2251,
            "rarity": 151,
            "type": "inversedEyes"
        },
        {
            "id": 3708,
            "rarity": 151,
            "type": "thirdEye"
        },
        {
            "id": 17,
            "rarity": 150,
            "type": "thirdEye"
        },
        {
            "id": 160,
            "rarity": 150,
            "type": "closedEyes"
        },
        {
            "id": 264,
            "rarity": 150,
            "type": "treeFrog(7)"
        },
        {
            "id": 408,
            "rarity": 150,
            "type": "thirdEye"
        },
        {
            "id": 598,
            "rarity": 150,
            "type": "thirdEye"
        },
        {
            "id": 679,
            "rarity": 150,
            "type": "inversedEyes"
        },
        {
            "id": 860,
            "rarity": 150,
            "type": "thirdEye"
        },
        {
            "id": 919,
            "rarity": 150,
            "type": "thirdEye"
        },
        {
            "id": 2468,
            "rarity": 150,
            "type": "thirdEye"
        },
        {
            "id": 2540,
            "rarity": 150,
            "type": "closedEyes"
        },
        {
            "id": 2717,
            "rarity": 150,
            "type": "treeFrog(2)"
        },
        {
            "id": 2801,
            "rarity": 150,
            "type": "thirdEye"
        },
        {
            "id": 3154,
            "rarity": 150,
            "type": "inversedEyes"
        },
        {
            "id": 3246,
            "rarity": 150,
            "type": "treeFrog(2)"
        },
        {
            "id": 3267,
            "rarity": 150,
            "type": "thirdEye"
        },
        {
            "id": 3503,
            "rarity": 150,
            "type": "inversedEyes"
        },
        {
            "id": 407,
            "rarity": 149,
            "type": "blueDartFrog"
        },
        {
            "id": 1123,
            "rarity": 149,
            "type": "thirdEye"
        },
        {
            "id": 3229,
            "rarity": 149,
            "type": "stawberryDartFrog"
        },
        {
            "id": 3444,
            "rarity": 149,
            "type": "thirdEye"
        },
        {
            "id": 1061,
            "rarity": 148,
            "type": "inversedEyes"
        },
        {
            "id": 1893,
            "rarity": 148,
            "type": "thirdEye"
        },
        {
            "id": 1927,
            "rarity": 148,
            "type": "inversedEyes"
        },
        {
            "id": 1965,
            "rarity": 148,
            "type": "thirdEye"
        },
        {
            "id": 3545,
            "rarity": 148,
            "type": "croaking"
        },
        {
            "id": 3903,
            "rarity": 148,
            "type": "unknown"
        },
        {
            "id": 3908,
            "rarity": 148,
            "type": "thirdEye"
        },
        {
            "id": 266,
            "rarity": 147,
            "type": "croaking"
        },
        {
            "id": 958,
            "rarity": 147,
            "type": "grayTreeFrog"
        },
        {
            "id": 1447,
            "rarity": 147,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1902,
            "rarity": 147,
            "type": "inversedEyes"
        },
        {
            "id": 2009,
            "rarity": 147,
            "type": "croaking"
        },
        {
            "id": 3247,
            "rarity": 147,
            "type": "inversedEyes"
        },
        {
            "id": 3794,
            "rarity": 147,
            "type": "thirdEye"
        },
        {
            "id": 415,
            "rarity": 146,
            "type": "unknown"
        },
        {
            "id": 2116,
            "rarity": 146,
            "type": "treeFrog(4)"
        },
        {
            "id": 2481,
            "rarity": 146,
            "type": "thirdEye"
        },
        {
            "id": 3425,
            "rarity": 146,
            "type": "grayTreeFrog"
        },
        {
            "id": 3801,
            "rarity": 146,
            "type": "closedEyes"
        },
        {
            "id": 3860,
            "rarity": 146,
            "type": "thirdEye"
        },
        {
            "id": 4000,
            "rarity": 146,
            "type": "goldenDartFrog"
        },
        {
            "id": 320,
            "rarity": 145,
            "type": "closedEyes"
        },
        {
            "id": 409,
            "rarity": 145,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 414,
            "rarity": 145,
            "type": "blueTreeFrog"
        },
        {
            "id": 1692,
            "rarity": 145,
            "type": "thirdEye"
        },
        {
            "id": 2118,
            "rarity": 145,
            "type": "treeFrog(5)"
        },
        {
            "id": 2413,
            "rarity": 145,
            "type": "inversedEyes"
        },
        {
            "id": 3949,
            "rarity": 145,
            "type": "thirdEye"
        },
        {
            "id": 360,
            "rarity": 144,
            "type": "closedEyes"
        },
        {
            "id": 1052,
            "rarity": 144,
            "type": "closedEyes"
        },
        {
            "id": 29,
            "rarity": 143,
            "type": "blueTreeFrog"
        },
        {
            "id": 66,
            "rarity": 143,
            "type": "closedEyes"
        },
        {
            "id": 69,
            "rarity": 143,
            "type": "closedEyes"
        },
        {
            "id": 1295,
            "rarity": 143,
            "type": "greenTreeFrog"
        },
        {
            "id": 1526,
            "rarity": 143,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2401,
            "rarity": 143,
            "type": "croaking"
        },
        {
            "id": 2784,
            "rarity": 143,
            "type": "closedEyes"
        },
        {
            "id": 3869,
            "rarity": 143,
            "type": "thirdEye"
        },
        {
            "id": 628,
            "rarity": 142,
            "type": "pinkTreeFrog"
        },
        {
            "id": 630,
            "rarity": 142,
            "type": "croaking"
        },
        {
            "id": 1296,
            "rarity": 142,
            "type": "brownTreeFrog"
        },
        {
            "id": 1567,
            "rarity": 142,
            "type": "closedEyes"
        },
        {
            "id": 2066,
            "rarity": 142,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2261,
            "rarity": 142,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2787,
            "rarity": 142,
            "type": "goldenTreeFrog"
        },
        {
            "id": 269,
            "rarity": 141,
            "type": "croaking"
        },
        {
            "id": 687,
            "rarity": 141,
            "type": "closedEyes"
        },
        {
            "id": 724,
            "rarity": 141,
            "type": "closedEyes"
        },
        {
            "id": 793,
            "rarity": 141,
            "type": "closedEyes"
        },
        {
            "id": 994,
            "rarity": 141,
            "type": "croaking"
        },
        {
            "id": 1282,
            "rarity": 141,
            "type": "closedEyes"
        },
        {
            "id": 1283,
            "rarity": 141,
            "type": "closedEyes"
        },
        {
            "id": 2192,
            "rarity": 141,
            "type": "closedEyes"
        },
        {
            "id": 2794,
            "rarity": 141,
            "type": "closedEyes"
        },
        {
            "id": 2962,
            "rarity": 141,
            "type": "closedEyes"
        },
        {
            "id": 91,
            "rarity": 140,
            "type": "croaking"
        },
        {
            "id": 1249,
            "rarity": 140,
            "type": "treeFrog(8)"
        },
        {
            "id": 2146,
            "rarity": 140,
            "type": "closedEyes"
        },
        {
            "id": 3047,
            "rarity": 140,
            "type": "closedEyes"
        },
        {
            "id": 3288,
            "rarity": 140,
            "type": "croaking"
        },
        {
            "id": 3476,
            "rarity": 140,
            "type": "croaking"
        },
        {
            "id": 3836,
            "rarity": 140,
            "type": "goldenDartFrog"
        },
        {
            "id": 333,
            "rarity": 139,
            "type": "closedEyes"
        },
        {
            "id": 512,
            "rarity": 139,
            "type": "closedEyes"
        },
        {
            "id": 1391,
            "rarity": 139,
            "type": "blueTreeFrog"
        },
        {
            "id": 1488,
            "rarity": 139,
            "type": "closedEyes"
        },
        {
            "id": 1988,
            "rarity": 139,
            "type": "treeFrog(6)"
        },
        {
            "id": 3632,
            "rarity": 139,
            "type": "croaking"
        },
        {
            "id": 105,
            "rarity": 138,
            "type": "croaking"
        },
        {
            "id": 543,
            "rarity": 138,
            "type": "croaking"
        },
        {
            "id": 935,
            "rarity": 138,
            "type": "croaking"
        },
        {
            "id": 974,
            "rarity": 138,
            "type": "croaking"
        },
        {
            "id": 1368,
            "rarity": 138,
            "type": "croaking"
        },
        {
            "id": 1871,
            "rarity": 138,
            "type": "croaking"
        },
        {
            "id": 2246,
            "rarity": 138,
            "type": "croaking"
        },
        {
            "id": 2276,
            "rarity": 138,
            "type": "croaking"
        },
        {
            "id": 2775,
            "rarity": 138,
            "type": "closedEyes"
        },
        {
            "id": 3253,
            "rarity": 138,
            "type": "grayTreeFrog"
        },
        {
            "id": 12,
            "rarity": 137,
            "type": "treeFrog(5)"
        },
        {
            "id": 1673,
            "rarity": 137,
            "type": "croaking"
        },
        {
            "id": 1831,
            "rarity": 137,
            "type": "thirdEye"
        },
        {
            "id": 1987,
            "rarity": 137,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3232,
            "rarity": 137,
            "type": "closedEyes"
        },
        {
            "id": 3376,
            "rarity": 137,
            "type": "closedEyes"
        },
        {
            "id": 3483,
            "rarity": 137,
            "type": "croaking"
        },
        {
            "id": 882,
            "rarity": 136,
            "type": "closedEyes"
        },
        {
            "id": 1484,
            "rarity": 136,
            "type": "closedEyes"
        },
        {
            "id": 1717,
            "rarity": 136,
            "type": "croaking"
        },
        {
            "id": 1863,
            "rarity": 136,
            "type": "treeFrog(8)"
        },
        {
            "id": 2189,
            "rarity": 136,
            "type": "treeFrog(7)"
        },
        {
            "id": 2875,
            "rarity": 136,
            "type": "closedEyes"
        },
        {
            "id": 3213,
            "rarity": 136,
            "type": "croaking"
        },
        {
            "id": 3990,
            "rarity": 136,
            "type": "croaking"
        },
        {
            "id": 2871,
            "rarity": 135,
            "type": "treeFrog(7)"
        },
        {
            "id": 206,
            "rarity": 134,
            "type": "croaking"
        },
        {
            "id": 388,
            "rarity": 134,
            "type": "croaking"
        },
        {
            "id": 857,
            "rarity": 134,
            "type": "closedEyes"
        },
        {
            "id": 2002,
            "rarity": 134,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3040,
            "rarity": 134,
            "type": "treeFrog(1)"
        },
        {
            "id": 3320,
            "rarity": 134,
            "type": "treeFrog(8)"
        },
        {
            "id": 3519,
            "rarity": 134,
            "type": "treeFrog(8)"
        },
        {
            "id": 3995,
            "rarity": 134,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 608,
            "rarity": 133,
            "type": "croaking"
        },
        {
            "id": 1338,
            "rarity": 133,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1361,
            "rarity": 133,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1821,
            "rarity": 133,
            "type": "goldenTreeFrog"
        },
        {
            "id": 3204,
            "rarity": 133,
            "type": "croaking"
        },
        {
            "id": 3703,
            "rarity": 133,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 629,
            "rarity": 132,
            "type": "inversedEyes"
        },
        {
            "id": 796,
            "rarity": 132,
            "type": "treeFrog(1)"
        },
        {
            "id": 1800,
            "rarity": 132,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2024,
            "rarity": 132,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2297,
            "rarity": 132,
            "type": "goldenDartFrog"
        },
        {
            "id": 2467,
            "rarity": 132,
            "type": "treeFrog(4)"
        },
        {
            "id": 2942,
            "rarity": 132,
            "type": "splendidLeafFrog"
        },
        {
            "id": 241,
            "rarity": 131,
            "type": "goldenTreeFrog"
        },
        {
            "id": 318,
            "rarity": 131,
            "type": "croaking"
        },
        {
            "id": 387,
            "rarity": 131,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1693,
            "rarity": 131,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1714,
            "rarity": 131,
            "type": "treeFrog(1)"
        },
        {
            "id": 2180,
            "rarity": 131,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2460,
            "rarity": 131,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3072,
            "rarity": 131,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3521,
            "rarity": 131,
            "type": "goldenTreeFrog"
        },
        {
            "id": 3804,
            "rarity": 131,
            "type": "blueDartFrog"
        },
        {
            "id": 16,
            "rarity": 130,
            "type": "purpleTreeFrog"
        },
        {
            "id": 202,
            "rarity": 130,
            "type": "thirdEye"
        },
        {
            "id": 1012,
            "rarity": 130,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1202,
            "rarity": 130,
            "type": "blueDartFrog"
        },
        {
            "id": 1465,
            "rarity": 130,
            "type": "inversedEyes"
        },
        {
            "id": 1731,
            "rarity": 130,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1849,
            "rarity": 130,
            "type": "goldenTreeFrog"
        },
        {
            "id": 3254,
            "rarity": 130,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3469,
            "rarity": 130,
            "type": "goldenTreeFrog"
        },
        {
            "id": 3789,
            "rarity": 130,
            "type": "goldenTreeFrog"
        },
        {
            "id": 421,
            "rarity": 129,
            "type": "treeFrog(7)"
        },
        {
            "id": 773,
            "rarity": 129,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1345,
            "rarity": 129,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1964,
            "rarity": 129,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2293,
            "rarity": 129,
            "type": "inversedEyes"
        },
        {
            "id": 2372,
            "rarity": 129,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2394,
            "rarity": 129,
            "type": "goldenTreeFrog"
        },
        {
            "id": 3496,
            "rarity": 129,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3772,
            "rarity": 129,
            "type": "goldenTreeFrog"
        },
        {
            "id": 111,
            "rarity": 128,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1473,
            "rarity": 128,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1550,
            "rarity": 128,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1861,
            "rarity": 128,
            "type": "thirdEye"
        },
        {
            "id": 2473,
            "rarity": 128,
            "type": "treeFrog(8)"
        },
        {
            "id": 2644,
            "rarity": 128,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2838,
            "rarity": 128,
            "type": "unknown"
        },
        {
            "id": 2892,
            "rarity": 128,
            "type": "blueTreeFrog"
        },
        {
            "id": 2993,
            "rarity": 128,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3242,
            "rarity": 128,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3829,
            "rarity": 128,
            "type": "goldenTreeFrog"
        },
        {
            "id": 31,
            "rarity": 127,
            "type": "goldenTreeFrog"
        },
        {
            "id": 914,
            "rarity": 127,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1290,
            "rarity": 127,
            "type": "inversedEyes"
        },
        {
            "id": 1460,
            "rarity": 127,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2124,
            "rarity": 127,
            "type": "splendidLeafFrog"
        },
        {
            "id": 2438,
            "rarity": 127,
            "type": "splendidLeafFrog"
        },
        {
            "id": 2449,
            "rarity": 127,
            "type": "blueTreeFrog"
        },
        {
            "id": 2541,
            "rarity": 127,
            "type": "greenTreeFrog"
        },
        {
            "id": 3025,
            "rarity": 127,
            "type": "grayTreeFrog"
        },
        {
            "id": 3181,
            "rarity": 127,
            "type": "thirdEye"
        },
        {
            "id": 3547,
            "rarity": 127,
            "type": "treeFrog(2)"
        },
        {
            "id": 3623,
            "rarity": 127,
            "type": "unknown"
        },
        {
            "id": 3832,
            "rarity": 127,
            "type": "blueDartFrog"
        },
        {
            "id": 3921,
            "rarity": 127,
            "type": "splendidLeafFrog"
        },
        {
            "id": 223,
            "rarity": 126,
            "type": "cyanTreeFrog"
        },
        {
            "id": 823,
            "rarity": 126,
            "type": "grayTreeFrog"
        },
        {
            "id": 1001,
            "rarity": 126,
            "type": "treeFrog(1)"
        },
        {
            "id": 1380,
            "rarity": 126,
            "type": "treeFrog(1)"
        },
        {
            "id": 1925,
            "rarity": 126,
            "type": "treeFrog(1)"
        },
        {
            "id": 2097,
            "rarity": 126,
            "type": "goldenDartFrog"
        },
        {
            "id": 2725,
            "rarity": 126,
            "type": "splendidLeafFrog"
        },
        {
            "id": 2847,
            "rarity": 126,
            "type": "greenTreeFrog"
        },
        {
            "id": 2956,
            "rarity": 126,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3051,
            "rarity": 126,
            "type": "treeFrog(1)"
        },
        {
            "id": 3079,
            "rarity": 126,
            "type": "greenTreeFrog"
        },
        {
            "id": 3465,
            "rarity": 126,
            "type": "unknown"
        },
        {
            "id": 3753,
            "rarity": 126,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3905,
            "rarity": 126,
            "type": "splendidLeafFrog"
        },
        {
            "id": 61,
            "rarity": 125,
            "type": "treeFrog(1)"
        },
        {
            "id": 132,
            "rarity": 125,
            "type": "stawberryDartFrog"
        },
        {
            "id": 718,
            "rarity": 125,
            "type": "treeFrog(1)"
        },
        {
            "id": 918,
            "rarity": 125,
            "type": "goldenDartFrog"
        },
        {
            "id": 995,
            "rarity": 125,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1017,
            "rarity": 125,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1063,
            "rarity": 125,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1163,
            "rarity": 125,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1366,
            "rarity": 125,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1538,
            "rarity": 125,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1687,
            "rarity": 125,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1789,
            "rarity": 125,
            "type": "goldenDartFrog"
        },
        {
            "id": 1892,
            "rarity": 125,
            "type": "thirdEye"
        },
        {
            "id": 2020,
            "rarity": 125,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2519,
            "rarity": 125,
            "type": "splendidLeafFrog"
        },
        {
            "id": 2711,
            "rarity": 125,
            "type": "splendidLeafFrog"
        },
        {
            "id": 2967,
            "rarity": 125,
            "type": "treeFrog(1)"
        },
        {
            "id": 3386,
            "rarity": 125,
            "type": "treeFrog(1)"
        },
        {
            "id": 3411,
            "rarity": 125,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3591,
            "rarity": 125,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3733,
            "rarity": 125,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3866,
            "rarity": 125,
            "type": "goldenTreeFrog"
        },
        {
            "id": 28,
            "rarity": 124,
            "type": "blueTreeFrog"
        },
        {
            "id": 80,
            "rarity": 124,
            "type": "unknown"
        },
        {
            "id": 171,
            "rarity": 124,
            "type": "greenTreeFrog"
        },
        {
            "id": 220,
            "rarity": 124,
            "type": "treeFrog(1)"
        },
        {
            "id": 438,
            "rarity": 124,
            "type": "goldenDartFrog"
        },
        {
            "id": 470,
            "rarity": 124,
            "type": "tomatoFrog"
        },
        {
            "id": 541,
            "rarity": 124,
            "type": "splendidLeafFrog"
        },
        {
            "id": 542,
            "rarity": 124,
            "type": "treeFrog(1)"
        },
        {
            "id": 752,
            "rarity": 124,
            "type": "goldenDartFrog"
        },
        {
            "id": 993,
            "rarity": 124,
            "type": "treeFrog(1)"
        },
        {
            "id": 1000,
            "rarity": 124,
            "type": "treeFrog(1)"
        },
        {
            "id": 1118,
            "rarity": 124,
            "type": "treeFrog(1)"
        },
        {
            "id": 1177,
            "rarity": 124,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1727,
            "rarity": 124,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1985,
            "rarity": 124,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1993,
            "rarity": 124,
            "type": "treeFrog(4)"
        },
        {
            "id": 2238,
            "rarity": 124,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2239,
            "rarity": 124,
            "type": "blueDartFrog"
        },
        {
            "id": 2266,
            "rarity": 124,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2270,
            "rarity": 124,
            "type": "splendidLeafFrog"
        },
        {
            "id": 2279,
            "rarity": 124,
            "type": "blueTreeFrog"
        },
        {
            "id": 2331,
            "rarity": 124,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2431,
            "rarity": 124,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2490,
            "rarity": 124,
            "type": "goldenDartFrog"
        },
        {
            "id": 2736,
            "rarity": 124,
            "type": "goldenDartFrog"
        },
        {
            "id": 2843,
            "rarity": 124,
            "type": "splendidLeafFrog"
        },
        {
            "id": 2846,
            "rarity": 124,
            "type": "greenTreeFrog"
        },
        {
            "id": 3321,
            "rarity": 124,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3423,
            "rarity": 124,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3600,
            "rarity": 124,
            "type": "treeFrog(1)"
        },
        {
            "id": 3762,
            "rarity": 124,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3873,
            "rarity": 124,
            "type": "greenTreeFrog"
        },
        {
            "id": 19,
            "rarity": 123,
            "type": "cyanTreeFrog"
        },
        {
            "id": 20,
            "rarity": 123,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 48,
            "rarity": 123,
            "type": "blueTreeFrog"
        },
        {
            "id": 186,
            "rarity": 123,
            "type": "purpleTreeFrog"
        },
        {
            "id": 205,
            "rarity": 123,
            "type": "purpleTreeFrog"
        },
        {
            "id": 454,
            "rarity": 123,
            "type": "treeFrog(1)"
        },
        {
            "id": 553,
            "rarity": 123,
            "type": "treeFrog(8)"
        },
        {
            "id": 581,
            "rarity": 123,
            "type": "inversedEyes"
        },
        {
            "id": 700,
            "rarity": 123,
            "type": "blueDartFrog"
        },
        {
            "id": 906,
            "rarity": 123,
            "type": "purpleTreeFrog"
        },
        {
            "id": 988,
            "rarity": 123,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1286,
            "rarity": 123,
            "type": "treeFrog(1)"
        },
        {
            "id": 1301,
            "rarity": 123,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1315,
            "rarity": 123,
            "type": "treeFrog(1)"
        },
        {
            "id": 1316,
            "rarity": 123,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1586,
            "rarity": 123,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2021,
            "rarity": 123,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2898,
            "rarity": 123,
            "type": "treeFrog(1)"
        },
        {
            "id": 3054,
            "rarity": 123,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3071,
            "rarity": 123,
            "type": "inversedEyes"
        },
        {
            "id": 3132,
            "rarity": 123,
            "type": "tomatoFrog"
        },
        {
            "id": 3280,
            "rarity": 123,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3533,
            "rarity": 123,
            "type": "pinkTreeFrog"
        },
        {
            "id": 73,
            "rarity": 122,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 133,
            "rarity": 122,
            "type": "treeFrog(1)"
        },
        {
            "id": 369,
            "rarity": 122,
            "type": "pinkTreeFrog"
        },
        {
            "id": 516,
            "rarity": 122,
            "type": "unknown"
        },
        {
            "id": 702,
            "rarity": 122,
            "type": "treeFrog(1)"
        },
        {
            "id": 969,
            "rarity": 122,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1241,
            "rarity": 122,
            "type": "grayTreeFrog"
        },
        {
            "id": 1245,
            "rarity": 122,
            "type": "goldenDartFrog"
        },
        {
            "id": 1462,
            "rarity": 122,
            "type": "treeFrog(1)"
        },
        {
            "id": 1582,
            "rarity": 122,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1784,
            "rarity": 122,
            "type": "blueDartFrog"
        },
        {
            "id": 1833,
            "rarity": 122,
            "type": "tomatoFrog"
        },
        {
            "id": 1840,
            "rarity": 122,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1980,
            "rarity": 122,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2037,
            "rarity": 122,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2167,
            "rarity": 122,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2254,
            "rarity": 122,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2368,
            "rarity": 122,
            "type": "goldenDartFrog"
        },
        {
            "id": 2382,
            "rarity": 122,
            "type": "blueDartFrog"
        },
        {
            "id": 2384,
            "rarity": 122,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2713,
            "rarity": 122,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2870,
            "rarity": 122,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2908,
            "rarity": 122,
            "type": "inversedEyes"
        },
        {
            "id": 3023,
            "rarity": 122,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3027,
            "rarity": 122,
            "type": "tomatoFrog"
        },
        {
            "id": 3233,
            "rarity": 122,
            "type": "goldenDartFrog"
        },
        {
            "id": 3377,
            "rarity": 122,
            "type": "greenTreeFrog"
        },
        {
            "id": 3883,
            "rarity": 122,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3902,
            "rarity": 122,
            "type": "tomatoFrog"
        },
        {
            "id": 4015,
            "rarity": 122,
            "type": "treeFrog(1)"
        },
        {
            "id": 172,
            "rarity": 121,
            "type": "orangeTreeFrog"
        },
        {
            "id": 252,
            "rarity": 121,
            "type": "orangeTreeFrog"
        },
        {
            "id": 453,
            "rarity": 121,
            "type": "tomatoFrog"
        },
        {
            "id": 758,
            "rarity": 121,
            "type": "blueDartFrog"
        },
        {
            "id": 1060,
            "rarity": 121,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1093,
            "rarity": 121,
            "type": "unknown"
        },
        {
            "id": 1198,
            "rarity": 121,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1239,
            "rarity": 121,
            "type": "treeFrog(1)"
        },
        {
            "id": 1277,
            "rarity": 121,
            "type": "blueDartFrog"
        },
        {
            "id": 1498,
            "rarity": 121,
            "type": "thirdEye"
        },
        {
            "id": 1540,
            "rarity": 121,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1591,
            "rarity": 121,
            "type": "blueTreeFrog"
        },
        {
            "id": 1607,
            "rarity": 121,
            "type": "goldenDartFrog"
        },
        {
            "id": 1713,
            "rarity": 121,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1737,
            "rarity": 121,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1880,
            "rarity": 121,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2049,
            "rarity": 121,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2079,
            "rarity": 121,
            "type": "unknown"
        },
        {
            "id": 2205,
            "rarity": 121,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2410,
            "rarity": 121,
            "type": "goldenDartFrog"
        },
        {
            "id": 2745,
            "rarity": 121,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2834,
            "rarity": 121,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2889,
            "rarity": 121,
            "type": "blueDartFrog"
        },
        {
            "id": 2938,
            "rarity": 121,
            "type": "blueDartFrog"
        },
        {
            "id": 2992,
            "rarity": 121,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3129,
            "rarity": 121,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3240,
            "rarity": 121,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3329,
            "rarity": 121,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3358,
            "rarity": 121,
            "type": "thirdEye"
        },
        {
            "id": 3412,
            "rarity": 121,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3459,
            "rarity": 121,
            "type": "closedEyes"
        },
        {
            "id": 3498,
            "rarity": 121,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3525,
            "rarity": 121,
            "type": "inversedEyes"
        },
        {
            "id": 3568,
            "rarity": 121,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3579,
            "rarity": 121,
            "type": "treeFrog(1)"
        },
        {
            "id": 3639,
            "rarity": 121,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3696,
            "rarity": 121,
            "type": "stawberryDartFrog"
        },
        {
            "id": 3749,
            "rarity": 121,
            "type": "orangeTreeFrog"
        },
        {
            "id": 255,
            "rarity": 120,
            "type": "grayTreeFrog"
        },
        {
            "id": 259,
            "rarity": 120,
            "type": "brownTreeFrog"
        },
        {
            "id": 398,
            "rarity": 120,
            "type": "grayTreeFrog"
        },
        {
            "id": 511,
            "rarity": 120,
            "type": "purpleTreeFrog"
        },
        {
            "id": 546,
            "rarity": 120,
            "type": "splendidLeafFrog"
        },
        {
            "id": 638,
            "rarity": 120,
            "type": "greenTreeFrog"
        },
        {
            "id": 953,
            "rarity": 120,
            "type": "tomatoFrog"
        },
        {
            "id": 1091,
            "rarity": 120,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1300,
            "rarity": 120,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1360,
            "rarity": 120,
            "type": "grayTreeFrog"
        },
        {
            "id": 1388,
            "rarity": 120,
            "type": "unknown"
        },
        {
            "id": 1596,
            "rarity": 120,
            "type": "blueDartFrog"
        },
        {
            "id": 1649,
            "rarity": 120,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1904,
            "rarity": 120,
            "type": "blueTreeFrog"
        },
        {
            "id": 1939,
            "rarity": 120,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1942,
            "rarity": 120,
            "type": "grayTreeFrog"
        },
        {
            "id": 1998,
            "rarity": 120,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2016,
            "rarity": 120,
            "type": "tomatoFrog"
        },
        {
            "id": 2039,
            "rarity": 120,
            "type": "thirdEye"
        },
        {
            "id": 2159,
            "rarity": 120,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2348,
            "rarity": 120,
            "type": "tomatoFrog"
        },
        {
            "id": 2469,
            "rarity": 120,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2522,
            "rarity": 120,
            "type": "blueTreeFrog"
        },
        {
            "id": 2525,
            "rarity": 120,
            "type": "treeFrog(1)"
        },
        {
            "id": 2631,
            "rarity": 120,
            "type": "greenTreeFrog"
        },
        {
            "id": 2661,
            "rarity": 120,
            "type": "brownTreeFrog"
        },
        {
            "id": 2743,
            "rarity": 120,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2901,
            "rarity": 120,
            "type": "unknown"
        },
        {
            "id": 3228,
            "rarity": 120,
            "type": "stawberryDartFrog"
        },
        {
            "id": 3475,
            "rarity": 120,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3500,
            "rarity": 120,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3653,
            "rarity": 120,
            "type": "brownTreeFrog"
        },
        {
            "id": 3732,
            "rarity": 120,
            "type": "stawberryDartFrog"
        },
        {
            "id": 3850,
            "rarity": 120,
            "type": "grayTreeFrog"
        },
        {
            "id": 3918,
            "rarity": 120,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3922,
            "rarity": 120,
            "type": "blueTreeFrog"
        },
        {
            "id": 3969,
            "rarity": 120,
            "type": "tomatoFrog"
        },
        {
            "id": 3971,
            "rarity": 120,
            "type": "purpleTreeFrog"
        },
        {
            "id": 4032,
            "rarity": 120,
            "type": "pinkTreeFrog"
        },
        {
            "id": 4039,
            "rarity": 120,
            "type": "greenTreeFrog"
        },
        {
            "id": 349,
            "rarity": 119,
            "type": "unknown"
        },
        {
            "id": 497,
            "rarity": 119,
            "type": "pinkTreeFrog"
        },
        {
            "id": 519,
            "rarity": 119,
            "type": "treeFrog(1)"
        },
        {
            "id": 549,
            "rarity": 119,
            "type": "pinkTreeFrog"
        },
        {
            "id": 688,
            "rarity": 119,
            "type": "goldenDartFrog"
        },
        {
            "id": 699,
            "rarity": 119,
            "type": "greenTreeFrog"
        },
        {
            "id": 784,
            "rarity": 119,
            "type": "unknown"
        },
        {
            "id": 887,
            "rarity": 119,
            "type": "greenTreeFrog"
        },
        {
            "id": 936,
            "rarity": 119,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1008,
            "rarity": 119,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1116,
            "rarity": 119,
            "type": "goldenDartFrog"
        },
        {
            "id": 1152,
            "rarity": 119,
            "type": "unknown"
        },
        {
            "id": 1233,
            "rarity": 119,
            "type": "blueTreeFrog"
        },
        {
            "id": 1236,
            "rarity": 119,
            "type": "goldenDartFrog"
        },
        {
            "id": 1346,
            "rarity": 119,
            "type": "closedEyes"
        },
        {
            "id": 1353,
            "rarity": 119,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1416,
            "rarity": 119,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1424,
            "rarity": 119,
            "type": "thirdEye"
        },
        {
            "id": 1449,
            "rarity": 119,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1559,
            "rarity": 119,
            "type": "unknown"
        },
        {
            "id": 1614,
            "rarity": 119,
            "type": "blueDartFrog"
        },
        {
            "id": 1724,
            "rarity": 119,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1758,
            "rarity": 119,
            "type": "grayTreeFrog"
        },
        {
            "id": 1895,
            "rarity": 119,
            "type": "treeFrog(8)"
        },
        {
            "id": 1917,
            "rarity": 119,
            "type": "greenTreeFrog"
        },
        {
            "id": 2050,
            "rarity": 119,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2077,
            "rarity": 119,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2085,
            "rarity": 119,
            "type": "goldenDartFrog"
        },
        {
            "id": 2303,
            "rarity": 119,
            "type": "grayTreeFrog"
        },
        {
            "id": 2314,
            "rarity": 119,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2615,
            "rarity": 119,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2687,
            "rarity": 119,
            "type": "treeFrog(1)"
        },
        {
            "id": 2700,
            "rarity": 119,
            "type": "goldenDartFrog"
        },
        {
            "id": 2785,
            "rarity": 119,
            "type": "tomatoFrog"
        },
        {
            "id": 2807,
            "rarity": 119,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2985,
            "rarity": 119,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3440,
            "rarity": 119,
            "type": "goldenDartFrog"
        },
        {
            "id": 3497,
            "rarity": 119,
            "type": "goldenDartFrog"
        },
        {
            "id": 3499,
            "rarity": 119,
            "type": "grayTreeFrog"
        },
        {
            "id": 3571,
            "rarity": 119,
            "type": "blueTreeFrog"
        },
        {
            "id": 3592,
            "rarity": 119,
            "type": "blueDartFrog"
        },
        {
            "id": 3702,
            "rarity": 119,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3904,
            "rarity": 119,
            "type": "brownTreeFrog"
        },
        {
            "id": 38,
            "rarity": 118,
            "type": "stawberryDartFrog"
        },
        {
            "id": 102,
            "rarity": 118,
            "type": "stawberryDartFrog"
        },
        {
            "id": 158,
            "rarity": 118,
            "type": "stawberryDartFrog"
        },
        {
            "id": 199,
            "rarity": 118,
            "type": "stawberryDartFrog"
        },
        {
            "id": 221,
            "rarity": 118,
            "type": "grayTreeFrog"
        },
        {
            "id": 329,
            "rarity": 118,
            "type": "closedEyes"
        },
        {
            "id": 336,
            "rarity": 118,
            "type": "purpleTreeFrog"
        },
        {
            "id": 339,
            "rarity": 118,
            "type": "greenTreeFrog"
        },
        {
            "id": 344,
            "rarity": 118,
            "type": "stawberryDartFrog"
        },
        {
            "id": 375,
            "rarity": 118,
            "type": "pinkTreeFrog"
        },
        {
            "id": 436,
            "rarity": 118,
            "type": "grayTreeFrog"
        },
        {
            "id": 494,
            "rarity": 118,
            "type": "pinkTreeFrog"
        },
        {
            "id": 653,
            "rarity": 118,
            "type": "blueDartFrog"
        },
        {
            "id": 749,
            "rarity": 118,
            "type": "purpleTreeFrog"
        },
        {
            "id": 822,
            "rarity": 118,
            "type": "goldenDartFrog"
        },
        {
            "id": 943,
            "rarity": 118,
            "type": "blueDartFrog"
        },
        {
            "id": 957,
            "rarity": 118,
            "type": "grayTreeFrog"
        },
        {
            "id": 985,
            "rarity": 118,
            "type": "greenTreeFrog"
        },
        {
            "id": 1075,
            "rarity": 118,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1102,
            "rarity": 118,
            "type": "goldenDartFrog"
        },
        {
            "id": 1139,
            "rarity": 118,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1156,
            "rarity": 118,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1205,
            "rarity": 118,
            "type": "blueDartFrog"
        },
        {
            "id": 1218,
            "rarity": 118,
            "type": "blueDartFrog"
        },
        {
            "id": 1234,
            "rarity": 118,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1494,
            "rarity": 118,
            "type": "grayTreeFrog"
        },
        {
            "id": 1580,
            "rarity": 118,
            "type": "greenTreeFrog"
        },
        {
            "id": 1675,
            "rarity": 118,
            "type": "grayTreeFrog"
        },
        {
            "id": 1684,
            "rarity": 118,
            "type": "unknown"
        },
        {
            "id": 1763,
            "rarity": 118,
            "type": "tomatoFrog"
        },
        {
            "id": 1823,
            "rarity": 118,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1848,
            "rarity": 118,
            "type": "blueDartFrog"
        },
        {
            "id": 1997,
            "rarity": 118,
            "type": "unknown"
        },
        {
            "id": 2264,
            "rarity": 118,
            "type": "blueDartFrog"
        },
        {
            "id": 2290,
            "rarity": 118,
            "type": "blueTreeFrog"
        },
        {
            "id": 2424,
            "rarity": 118,
            "type": "greenTreeFrog"
        },
        {
            "id": 2527,
            "rarity": 118,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2760,
            "rarity": 118,
            "type": "greenTreeFrog"
        },
        {
            "id": 2804,
            "rarity": 118,
            "type": "blueDartFrog"
        },
        {
            "id": 2995,
            "rarity": 118,
            "type": "blueTreeFrog"
        },
        {
            "id": 2998,
            "rarity": 118,
            "type": "tomatoFrog"
        },
        {
            "id": 3157,
            "rarity": 118,
            "type": "croaking"
        },
        {
            "id": 3169,
            "rarity": 118,
            "type": "blueDartFrog"
        },
        {
            "id": 3451,
            "rarity": 118,
            "type": "blueDartFrog"
        },
        {
            "id": 3686,
            "rarity": 118,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3720,
            "rarity": 118,
            "type": "pinkTreeFrog"
        },
        {
            "id": 95,
            "rarity": 117,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 256,
            "rarity": 117,
            "type": "blueTreeFrog"
        },
        {
            "id": 334,
            "rarity": 117,
            "type": "blueDartFrog"
        },
        {
            "id": 384,
            "rarity": 117,
            "type": "greenTreeFrog"
        },
        {
            "id": 458,
            "rarity": 117,
            "type": "unknown"
        },
        {
            "id": 476,
            "rarity": 117,
            "type": "cyanTreeFrog"
        },
        {
            "id": 644,
            "rarity": 117,
            "type": "unknown"
        },
        {
            "id": 681,
            "rarity": 117,
            "type": "blueTreeFrog"
        },
        {
            "id": 683,
            "rarity": 117,
            "type": "blueDartFrog"
        },
        {
            "id": 786,
            "rarity": 117,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 803,
            "rarity": 117,
            "type": "orangeTreeFrog"
        },
        {
            "id": 921,
            "rarity": 117,
            "type": "tomatoFrog"
        },
        {
            "id": 1025,
            "rarity": 117,
            "type": "tomatoFrog"
        },
        {
            "id": 1120,
            "rarity": 117,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1126,
            "rarity": 117,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1312,
            "rarity": 117,
            "type": "blueDartFrog"
        },
        {
            "id": 1331,
            "rarity": 117,
            "type": "unknown"
        },
        {
            "id": 1571,
            "rarity": 117,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1708,
            "rarity": 117,
            "type": "blueDartFrog"
        },
        {
            "id": 1709,
            "rarity": 117,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1836,
            "rarity": 117,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1859,
            "rarity": 117,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2044,
            "rarity": 117,
            "type": "treeFrog(6)"
        },
        {
            "id": 2074,
            "rarity": 117,
            "type": "greenTreeFrog"
        },
        {
            "id": 2086,
            "rarity": 117,
            "type": "goldenDartFrog"
        },
        {
            "id": 2093,
            "rarity": 117,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2439,
            "rarity": 117,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2501,
            "rarity": 117,
            "type": "unknown"
        },
        {
            "id": 2512,
            "rarity": 117,
            "type": "grayTreeFrog"
        },
        {
            "id": 2561,
            "rarity": 117,
            "type": "goldenDartFrog"
        },
        {
            "id": 2628,
            "rarity": 117,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2749,
            "rarity": 117,
            "type": "greenTreeFrog"
        },
        {
            "id": 2778,
            "rarity": 117,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2860,
            "rarity": 117,
            "type": "blueTreeFrog"
        },
        {
            "id": 2911,
            "rarity": 117,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2934,
            "rarity": 117,
            "type": "treeFrog(7)"
        },
        {
            "id": 3004,
            "rarity": 117,
            "type": "brownTreeFrog"
        },
        {
            "id": 3007,
            "rarity": 117,
            "type": "grayTreeFrog"
        },
        {
            "id": 3070,
            "rarity": 117,
            "type": "stawberryDartFrog"
        },
        {
            "id": 3109,
            "rarity": 117,
            "type": "grayTreeFrog"
        },
        {
            "id": 3135,
            "rarity": 117,
            "type": "blueTreeFrog"
        },
        {
            "id": 3136,
            "rarity": 117,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3177,
            "rarity": 117,
            "type": "greenTreeFrog"
        },
        {
            "id": 3199,
            "rarity": 117,
            "type": "greenTreeFrog"
        },
        {
            "id": 3324,
            "rarity": 117,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3359,
            "rarity": 117,
            "type": "stawberryDartFrog"
        },
        {
            "id": 3396,
            "rarity": 117,
            "type": "tomatoFrog"
        },
        {
            "id": 3517,
            "rarity": 117,
            "type": "goldenDartFrog"
        },
        {
            "id": 3558,
            "rarity": 117,
            "type": "greenTreeFrog"
        },
        {
            "id": 3588,
            "rarity": 117,
            "type": "goldenDartFrog"
        },
        {
            "id": 3645,
            "rarity": 117,
            "type": "tomatoFrog"
        },
        {
            "id": 3667,
            "rarity": 117,
            "type": "blueTreeFrog"
        },
        {
            "id": 3867,
            "rarity": 117,
            "type": "tomatoFrog"
        },
        {
            "id": 3931,
            "rarity": 117,
            "type": "tomatoFrog"
        },
        {
            "id": 3956,
            "rarity": 117,
            "type": "blueTreeFrog"
        },
        {
            "id": 57,
            "rarity": 116,
            "type": "greenTreeFrog"
        },
        {
            "id": 97,
            "rarity": 116,
            "type": "blueTreeFrog"
        },
        {
            "id": 98,
            "rarity": 116,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 141,
            "rarity": 116,
            "type": "greenTreeFrog"
        },
        {
            "id": 150,
            "rarity": 116,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 268,
            "rarity": 116,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 588,
            "rarity": 116,
            "type": "tomatoFrog"
        },
        {
            "id": 690,
            "rarity": 116,
            "type": "blueDartFrog"
        },
        {
            "id": 797,
            "rarity": 116,
            "type": "blueTreeFrog"
        },
        {
            "id": 810,
            "rarity": 116,
            "type": "tomatoFrog"
        },
        {
            "id": 829,
            "rarity": 116,
            "type": "blueTreeFrog"
        },
        {
            "id": 840,
            "rarity": 116,
            "type": "unknown"
        },
        {
            "id": 866,
            "rarity": 116,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 898,
            "rarity": 116,
            "type": "croaking"
        },
        {
            "id": 954,
            "rarity": 116,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1138,
            "rarity": 116,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1242,
            "rarity": 116,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1332,
            "rarity": 116,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1511,
            "rarity": 116,
            "type": "goldenDartFrog"
        },
        {
            "id": 1555,
            "rarity": 116,
            "type": "inversedEyes"
        },
        {
            "id": 1590,
            "rarity": 116,
            "type": "grayTreeFrog"
        },
        {
            "id": 1655,
            "rarity": 116,
            "type": "blueDartFrog"
        },
        {
            "id": 1669,
            "rarity": 116,
            "type": "blueTreeFrog"
        },
        {
            "id": 1707,
            "rarity": 116,
            "type": "goldenDartFrog"
        },
        {
            "id": 1716,
            "rarity": 116,
            "type": "blueTreeFrog"
        },
        {
            "id": 1884,
            "rarity": 116,
            "type": "blueDartFrog"
        },
        {
            "id": 1991,
            "rarity": 116,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2060,
            "rarity": 116,
            "type": "treeFrog(5)"
        },
        {
            "id": 2117,
            "rarity": 116,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2143,
            "rarity": 116,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2152,
            "rarity": 116,
            "type": "unknown"
        },
        {
            "id": 2249,
            "rarity": 116,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2278,
            "rarity": 116,
            "type": "goldenDartFrog"
        },
        {
            "id": 2334,
            "rarity": 116,
            "type": "grayTreeFrog"
        },
        {
            "id": 2338,
            "rarity": 116,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2350,
            "rarity": 116,
            "type": "blueDartFrog"
        },
        {
            "id": 2353,
            "rarity": 116,
            "type": "blueDartFrog"
        },
        {
            "id": 2403,
            "rarity": 116,
            "type": "tomatoFrog"
        },
        {
            "id": 2416,
            "rarity": 116,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2555,
            "rarity": 116,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2567,
            "rarity": 116,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2577,
            "rarity": 116,
            "type": "blueTreeFrog"
        },
        {
            "id": 2694,
            "rarity": 116,
            "type": "closedEyes"
        },
        {
            "id": 2767,
            "rarity": 116,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2836,
            "rarity": 116,
            "type": "tomatoFrog"
        },
        {
            "id": 2907,
            "rarity": 116,
            "type": "unknown"
        },
        {
            "id": 2973,
            "rarity": 116,
            "type": "tomatoFrog"
        },
        {
            "id": 2977,
            "rarity": 116,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2987,
            "rarity": 116,
            "type": "brownTreeFrog"
        },
        {
            "id": 3065,
            "rarity": 116,
            "type": "tomatoFrog"
        },
        {
            "id": 3113,
            "rarity": 116,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3236,
            "rarity": 116,
            "type": "greenTreeFrog"
        },
        {
            "id": 3332,
            "rarity": 116,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3438,
            "rarity": 116,
            "type": "tomatoFrog"
        },
        {
            "id": 3618,
            "rarity": 116,
            "type": "grayTreeFrog"
        },
        {
            "id": 3687,
            "rarity": 116,
            "type": "greenTreeFrog"
        },
        {
            "id": 3690,
            "rarity": 116,
            "type": "grayTreeFrog"
        },
        {
            "id": 3891,
            "rarity": 116,
            "type": "grayTreeFrog"
        },
        {
            "id": 3968,
            "rarity": 116,
            "type": "tomatoFrog"
        },
        {
            "id": 3978,
            "rarity": 116,
            "type": "tomatoFrog"
        },
        {
            "id": 104,
            "rarity": 115,
            "type": "greenTreeFrog"
        },
        {
            "id": 209,
            "rarity": 115,
            "type": "goldenDartFrog"
        },
        {
            "id": 271,
            "rarity": 115,
            "type": "greenTreeFrog"
        },
        {
            "id": 429,
            "rarity": 115,
            "type": "greenTreeFrog"
        },
        {
            "id": 469,
            "rarity": 115,
            "type": "cyanTreeFrog"
        },
        {
            "id": 482,
            "rarity": 115,
            "type": "unknown"
        },
        {
            "id": 501,
            "rarity": 115,
            "type": "goldenDartFrog"
        },
        {
            "id": 570,
            "rarity": 115,
            "type": "greenTreeFrog"
        },
        {
            "id": 605,
            "rarity": 115,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 677,
            "rarity": 115,
            "type": "goldenDartFrog"
        },
        {
            "id": 754,
            "rarity": 115,
            "type": "pinkTreeFrog"
        },
        {
            "id": 831,
            "rarity": 115,
            "type": "blueTreeFrog"
        },
        {
            "id": 909,
            "rarity": 115,
            "type": "unknown"
        },
        {
            "id": 979,
            "rarity": 115,
            "type": "tomatoFrog"
        },
        {
            "id": 1024,
            "rarity": 115,
            "type": "grayTreeFrog"
        },
        {
            "id": 1098,
            "rarity": 115,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1164,
            "rarity": 115,
            "type": "unknown"
        },
        {
            "id": 1168,
            "rarity": 115,
            "type": "brownTreeFrog"
        },
        {
            "id": 1172,
            "rarity": 115,
            "type": "unknown"
        },
        {
            "id": 1307,
            "rarity": 115,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1311,
            "rarity": 115,
            "type": "goldenDartFrog"
        },
        {
            "id": 1348,
            "rarity": 115,
            "type": "brownTreeFrog"
        },
        {
            "id": 1363,
            "rarity": 115,
            "type": "greenTreeFrog"
        },
        {
            "id": 1439,
            "rarity": 115,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1583,
            "rarity": 115,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1597,
            "rarity": 115,
            "type": "tomatoFrog"
        },
        {
            "id": 1658,
            "rarity": 115,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1771,
            "rarity": 115,
            "type": "blueTreeFrog"
        },
        {
            "id": 1773,
            "rarity": 115,
            "type": "greenTreeFrog"
        },
        {
            "id": 1845,
            "rarity": 115,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1949,
            "rarity": 115,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1972,
            "rarity": 115,
            "type": "unknown"
        },
        {
            "id": 1975,
            "rarity": 115,
            "type": "greenTreeFrog"
        },
        {
            "id": 2046,
            "rarity": 115,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2131,
            "rarity": 115,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2221,
            "rarity": 115,
            "type": "goldenDartFrog"
        },
        {
            "id": 2488,
            "rarity": 115,
            "type": "tomatoFrog"
        },
        {
            "id": 2651,
            "rarity": 115,
            "type": "blueTreeFrog"
        },
        {
            "id": 2701,
            "rarity": 115,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2706,
            "rarity": 115,
            "type": "greenTreeFrog"
        },
        {
            "id": 2727,
            "rarity": 115,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2780,
            "rarity": 115,
            "type": "tomatoFrog"
        },
        {
            "id": 2861,
            "rarity": 115,
            "type": "blueDartFrog"
        },
        {
            "id": 2904,
            "rarity": 115,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2966,
            "rarity": 115,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2972,
            "rarity": 115,
            "type": "tomatoFrog"
        },
        {
            "id": 3102,
            "rarity": 115,
            "type": "goldenDartFrog"
        },
        {
            "id": 3572,
            "rarity": 115,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3596,
            "rarity": 115,
            "type": "unknown"
        },
        {
            "id": 3627,
            "rarity": 115,
            "type": "goldenDartFrog"
        },
        {
            "id": 3640,
            "rarity": 115,
            "type": "croaking"
        },
        {
            "id": 3769,
            "rarity": 115,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3870,
            "rarity": 115,
            "type": "greenTreeFrog"
        },
        {
            "id": 3875,
            "rarity": 115,
            "type": "greenTreeFrog"
        },
        {
            "id": 3976,
            "rarity": 115,
            "type": "blueTreeFrog"
        },
        {
            "id": 75,
            "rarity": 114,
            "type": "blueDartFrog"
        },
        {
            "id": 116,
            "rarity": 114,
            "type": "thirdEye"
        },
        {
            "id": 135,
            "rarity": 114,
            "type": "cyanTreeFrog"
        },
        {
            "id": 240,
            "rarity": 114,
            "type": "cyanTreeFrog"
        },
        {
            "id": 277,
            "rarity": 114,
            "type": "unknown"
        },
        {
            "id": 341,
            "rarity": 114,
            "type": "brownTreeFrog"
        },
        {
            "id": 466,
            "rarity": 114,
            "type": "grayTreeFrog"
        },
        {
            "id": 515,
            "rarity": 114,
            "type": "brownTreeFrog"
        },
        {
            "id": 609,
            "rarity": 114,
            "type": "blueTreeFrog"
        },
        {
            "id": 744,
            "rarity": 114,
            "type": "pinkTreeFrog"
        },
        {
            "id": 768,
            "rarity": 114,
            "type": "treeFrog(8)"
        },
        {
            "id": 851,
            "rarity": 114,
            "type": "goldenDartFrog"
        },
        {
            "id": 888,
            "rarity": 114,
            "type": "orangeTreeFrog"
        },
        {
            "id": 896,
            "rarity": 114,
            "type": "blueTreeFrog"
        },
        {
            "id": 901,
            "rarity": 114,
            "type": "purpleTreeFrog"
        },
        {
            "id": 904,
            "rarity": 114,
            "type": "blueTreeFrog"
        },
        {
            "id": 912,
            "rarity": 114,
            "type": "goldenDartFrog"
        },
        {
            "id": 1072,
            "rarity": 114,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1081,
            "rarity": 114,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1121,
            "rarity": 114,
            "type": "brownTreeFrog"
        },
        {
            "id": 1147,
            "rarity": 114,
            "type": "goldenDartFrog"
        },
        {
            "id": 1167,
            "rarity": 114,
            "type": "brownTreeFrog"
        },
        {
            "id": 1223,
            "rarity": 114,
            "type": "goldenDartFrog"
        },
        {
            "id": 1225,
            "rarity": 114,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1310,
            "rarity": 114,
            "type": "unknown"
        },
        {
            "id": 1326,
            "rarity": 114,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1427,
            "rarity": 114,
            "type": "brownTreeFrog"
        },
        {
            "id": 1432,
            "rarity": 114,
            "type": "brownTreeFrog"
        },
        {
            "id": 1720,
            "rarity": 114,
            "type": "brownTreeFrog"
        },
        {
            "id": 1778,
            "rarity": 114,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1982,
            "rarity": 114,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2010,
            "rarity": 114,
            "type": "brownTreeFrog"
        },
        {
            "id": 2027,
            "rarity": 114,
            "type": "tomatoFrog"
        },
        {
            "id": 2088,
            "rarity": 114,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2132,
            "rarity": 114,
            "type": "tomatoFrog"
        },
        {
            "id": 2263,
            "rarity": 114,
            "type": "goldenDartFrog"
        },
        {
            "id": 2277,
            "rarity": 114,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2378,
            "rarity": 114,
            "type": "goldenDartFrog"
        },
        {
            "id": 2417,
            "rarity": 114,
            "type": "brownTreeFrog"
        },
        {
            "id": 2458,
            "rarity": 114,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2478,
            "rarity": 114,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2562,
            "rarity": 114,
            "type": "unknown"
        },
        {
            "id": 2585,
            "rarity": 114,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2879,
            "rarity": 114,
            "type": "greenTreeFrog"
        },
        {
            "id": 2921,
            "rarity": 114,
            "type": "grayTreeFrog"
        },
        {
            "id": 3014,
            "rarity": 114,
            "type": "stawberryDartFrog"
        },
        {
            "id": 3046,
            "rarity": 114,
            "type": "greenTreeFrog"
        },
        {
            "id": 3081,
            "rarity": 114,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3091,
            "rarity": 114,
            "type": "grayTreeFrog"
        },
        {
            "id": 3106,
            "rarity": 114,
            "type": "grayTreeFrog"
        },
        {
            "id": 3163,
            "rarity": 114,
            "type": "unknown"
        },
        {
            "id": 3325,
            "rarity": 114,
            "type": "grayTreeFrog"
        },
        {
            "id": 3452,
            "rarity": 114,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3664,
            "rarity": 114,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3820,
            "rarity": 114,
            "type": "unknown"
        },
        {
            "id": 33,
            "rarity": 113,
            "type": "treeFrog(7)"
        },
        {
            "id": 115,
            "rarity": 113,
            "type": "brownTreeFrog"
        },
        {
            "id": 137,
            "rarity": 113,
            "type": "brownTreeFrog"
        },
        {
            "id": 139,
            "rarity": 113,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 140,
            "rarity": 113,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 263,
            "rarity": 113,
            "type": "tomatoFrog"
        },
        {
            "id": 283,
            "rarity": 113,
            "type": "treeFrog(7)"
        },
        {
            "id": 317,
            "rarity": 113,
            "type": "brownTreeFrog"
        },
        {
            "id": 474,
            "rarity": 113,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 499,
            "rarity": 113,
            "type": "croaking"
        },
        {
            "id": 691,
            "rarity": 113,
            "type": "cyanTreeFrog"
        },
        {
            "id": 929,
            "rarity": 113,
            "type": "unknown"
        },
        {
            "id": 934,
            "rarity": 113,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1150,
            "rarity": 113,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1166,
            "rarity": 113,
            "type": "blueTreeFrog"
        },
        {
            "id": 1421,
            "rarity": 113,
            "type": "greenTreeFrog"
        },
        {
            "id": 1677,
            "rarity": 113,
            "type": "goldenDartFrog"
        },
        {
            "id": 1730,
            "rarity": 113,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1785,
            "rarity": 113,
            "type": "blueDartFrog"
        },
        {
            "id": 1798,
            "rarity": 113,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1829,
            "rarity": 113,
            "type": "brownTreeFrog"
        },
        {
            "id": 2006,
            "rarity": 113,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2014,
            "rarity": 113,
            "type": "unknown"
        },
        {
            "id": 2090,
            "rarity": 113,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2187,
            "rarity": 113,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2252,
            "rarity": 113,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2269,
            "rarity": 113,
            "type": "brownTreeFrog"
        },
        {
            "id": 2374,
            "rarity": 113,
            "type": "brownTreeFrog"
        },
        {
            "id": 2377,
            "rarity": 113,
            "type": "brownTreeFrog"
        },
        {
            "id": 2381,
            "rarity": 113,
            "type": "greenTreeFrog"
        },
        {
            "id": 2558,
            "rarity": 113,
            "type": "unknown"
        },
        {
            "id": 2633,
            "rarity": 113,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2740,
            "rarity": 113,
            "type": "blueTreeFrog"
        },
        {
            "id": 2997,
            "rarity": 113,
            "type": "stawberryDartFrog"
        },
        {
            "id": 3110,
            "rarity": 113,
            "type": "tomatoFrog"
        },
        {
            "id": 3380,
            "rarity": 113,
            "type": "brownTreeFrog"
        },
        {
            "id": 3466,
            "rarity": 113,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3563,
            "rarity": 113,
            "type": "greenTreeFrog"
        },
        {
            "id": 3610,
            "rarity": 113,
            "type": "brownTreeFrog"
        },
        {
            "id": 3635,
            "rarity": 113,
            "type": "goldenDartFrog"
        },
        {
            "id": 3788,
            "rarity": 113,
            "type": "tomatoFrog"
        },
        {
            "id": 3831,
            "rarity": 113,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3900,
            "rarity": 113,
            "type": "tomatoFrog"
        },
        {
            "id": 3980,
            "rarity": 113,
            "type": "greenTreeFrog"
        },
        {
            "id": 72,
            "rarity": 112,
            "type": "cyanTreeFrog"
        },
        {
            "id": 74,
            "rarity": 112,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 142,
            "rarity": 112,
            "type": "brownTreeFrog"
        },
        {
            "id": 224,
            "rarity": 112,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 412,
            "rarity": 112,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 563,
            "rarity": 112,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 572,
            "rarity": 112,
            "type": "treeFrog(6)"
        },
        {
            "id": 593,
            "rarity": 112,
            "type": "greenTreeFrog"
        },
        {
            "id": 678,
            "rarity": 112,
            "type": "closedEyes"
        },
        {
            "id": 701,
            "rarity": 112,
            "type": "unknown"
        },
        {
            "id": 762,
            "rarity": 112,
            "type": "cyanTreeFrog"
        },
        {
            "id": 815,
            "rarity": 112,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 999,
            "rarity": 112,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1041,
            "rarity": 112,
            "type": "brownTreeFrog"
        },
        {
            "id": 1085,
            "rarity": 112,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1100,
            "rarity": 112,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1235,
            "rarity": 112,
            "type": "goldenDartFrog"
        },
        {
            "id": 1271,
            "rarity": 112,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1493,
            "rarity": 112,
            "type": "unknown"
        },
        {
            "id": 1587,
            "rarity": 112,
            "type": "tomatoFrog"
        },
        {
            "id": 1623,
            "rarity": 112,
            "type": "greenTreeFrog"
        },
        {
            "id": 1807,
            "rarity": 112,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1828,
            "rarity": 112,
            "type": "blueDartFrog"
        },
        {
            "id": 1837,
            "rarity": 112,
            "type": "grayTreeFrog"
        },
        {
            "id": 1953,
            "rarity": 112,
            "type": "goldenDartFrog"
        },
        {
            "id": 2056,
            "rarity": 112,
            "type": "greenTreeFrog"
        },
        {
            "id": 2156,
            "rarity": 112,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2365,
            "rarity": 112,
            "type": "brownTreeFrog"
        },
        {
            "id": 2910,
            "rarity": 112,
            "type": "closedEyes"
        },
        {
            "id": 2978,
            "rarity": 112,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3005,
            "rarity": 112,
            "type": "brownTreeFrog"
        },
        {
            "id": 3078,
            "rarity": 112,
            "type": "tomatoFrog"
        },
        {
            "id": 3208,
            "rarity": 112,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3487,
            "rarity": 112,
            "type": "goldenTreeFrog"
        },
        {
            "id": 3622,
            "rarity": 112,
            "type": "brownTreeFrog"
        },
        {
            "id": 3671,
            "rarity": 112,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3685,
            "rarity": 112,
            "type": "unknown"
        },
        {
            "id": 3743,
            "rarity": 112,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3950,
            "rarity": 112,
            "type": "tomatoFrog"
        },
        {
            "id": 3989,
            "rarity": 112,
            "type": "treeFrog(6)"
        },
        {
            "id": 136,
            "rarity": 111,
            "type": "tomatoFrog"
        },
        {
            "id": 257,
            "rarity": 111,
            "type": "unknown"
        },
        {
            "id": 359,
            "rarity": 111,
            "type": "unknown"
        },
        {
            "id": 373,
            "rarity": 111,
            "type": "brownTreeFrog"
        },
        {
            "id": 396,
            "rarity": 111,
            "type": "tomatoFrog"
        },
        {
            "id": 440,
            "rarity": 111,
            "type": "greenTreeFrog"
        },
        {
            "id": 603,
            "rarity": 111,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 633,
            "rarity": 111,
            "type": "goldenDartFrog"
        },
        {
            "id": 669,
            "rarity": 111,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 824,
            "rarity": 111,
            "type": "goldenDartFrog"
        },
        {
            "id": 949,
            "rarity": 111,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1090,
            "rarity": 111,
            "type": "greenTreeFrog"
        },
        {
            "id": 1261,
            "rarity": 111,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1461,
            "rarity": 111,
            "type": "blueDartFrog"
        },
        {
            "id": 1616,
            "rarity": 111,
            "type": "brownTreeFrog"
        },
        {
            "id": 1797,
            "rarity": 111,
            "type": "greenTreeFrog"
        },
        {
            "id": 1891,
            "rarity": 111,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2125,
            "rarity": 111,
            "type": "grayTreeFrog"
        },
        {
            "id": 2243,
            "rarity": 111,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2260,
            "rarity": 111,
            "type": "blueTreeFrog"
        },
        {
            "id": 2342,
            "rarity": 111,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2404,
            "rarity": 111,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2408,
            "rarity": 111,
            "type": "brownTreeFrog"
        },
        {
            "id": 2447,
            "rarity": 111,
            "type": "grayTreeFrog"
        },
        {
            "id": 2477,
            "rarity": 111,
            "type": "blueTreeFrog"
        },
        {
            "id": 2506,
            "rarity": 111,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2768,
            "rarity": 111,
            "type": "tomatoFrog"
        },
        {
            "id": 2925,
            "rarity": 111,
            "type": "brownTreeFrog"
        },
        {
            "id": 2932,
            "rarity": 111,
            "type": "closedEyes"
        },
        {
            "id": 3203,
            "rarity": 111,
            "type": "brownTreeFrog"
        },
        {
            "id": 3322,
            "rarity": 111,
            "type": "brownTreeFrog"
        },
        {
            "id": 3362,
            "rarity": 111,
            "type": "brownTreeFrog"
        },
        {
            "id": 37,
            "rarity": 110,
            "type": "blueTreeFrog"
        },
        {
            "id": 179,
            "rarity": 110,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 229,
            "rarity": 110,
            "type": "greenTreeFrog"
        },
        {
            "id": 273,
            "rarity": 110,
            "type": "treeFrog(3)"
        },
        {
            "id": 602,
            "rarity": 110,
            "type": "cyanTreeFrog"
        },
        {
            "id": 626,
            "rarity": 110,
            "type": "tomatoFrog"
        },
        {
            "id": 771,
            "rarity": 110,
            "type": "cyanTreeFrog"
        },
        {
            "id": 850,
            "rarity": 110,
            "type": "grayTreeFrog"
        },
        {
            "id": 862,
            "rarity": 110,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 981,
            "rarity": 110,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1185,
            "rarity": 110,
            "type": "unknown"
        },
        {
            "id": 1309,
            "rarity": 110,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1468,
            "rarity": 110,
            "type": "brownTreeFrog"
        },
        {
            "id": 1492,
            "rarity": 110,
            "type": "unknown"
        },
        {
            "id": 1631,
            "rarity": 110,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1961,
            "rarity": 110,
            "type": "treeFrog(2)"
        },
        {
            "id": 1977,
            "rarity": 110,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2213,
            "rarity": 110,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2436,
            "rarity": 110,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2464,
            "rarity": 110,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2474,
            "rarity": 110,
            "type": "greenTreeFrog"
        },
        {
            "id": 2505,
            "rarity": 110,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2509,
            "rarity": 110,
            "type": "brownTreeFrog"
        },
        {
            "id": 2608,
            "rarity": 110,
            "type": "greenTreeFrog"
        },
        {
            "id": 2766,
            "rarity": 110,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3042,
            "rarity": 110,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3315,
            "rarity": 110,
            "type": "unknown"
        },
        {
            "id": 3626,
            "rarity": 110,
            "type": "closedEyes"
        },
        {
            "id": 148,
            "rarity": 109,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 243,
            "rarity": 109,
            "type": "croaking"
        },
        {
            "id": 486,
            "rarity": 109,
            "type": "brownTreeFrog"
        },
        {
            "id": 505,
            "rarity": 109,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 948,
            "rarity": 109,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1105,
            "rarity": 109,
            "type": "croaking"
        },
        {
            "id": 1400,
            "rarity": 109,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1509,
            "rarity": 109,
            "type": "treeFrog(2)"
        },
        {
            "id": 1547,
            "rarity": 109,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1636,
            "rarity": 109,
            "type": "treeFrog(8)"
        },
        {
            "id": 2182,
            "rarity": 109,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2618,
            "rarity": 109,
            "type": "grayTreeFrog"
        },
        {
            "id": 2812,
            "rarity": 109,
            "type": "brownTreeFrog"
        },
        {
            "id": 3105,
            "rarity": 109,
            "type": "treeFrog(8)"
        },
        {
            "id": 3173,
            "rarity": 109,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3570,
            "rarity": 109,
            "type": "treeFrog(5)"
        },
        {
            "id": 3763,
            "rarity": 109,
            "type": "treeFrog(5)"
        },
        {
            "id": 3768,
            "rarity": 109,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3884,
            "rarity": 109,
            "type": "treeFrog(2)"
        },
        {
            "id": 3945,
            "rarity": 109,
            "type": "goldenTreeFrog"
        },
        {
            "id": 3951,
            "rarity": 109,
            "type": "blueTreeFrog"
        },
        {
            "id": 1,
            "rarity": 108,
            "type": "cyanTreeFrog"
        },
        {
            "id": 292,
            "rarity": 108,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1146,
            "rarity": 108,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1392,
            "rarity": 108,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1648,
            "rarity": 108,
            "type": "brownTreeFrog"
        },
        {
            "id": 1781,
            "rarity": 108,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1934,
            "rarity": 108,
            "type": "treeFrog(2)"
        },
        {
            "id": 2208,
            "rarity": 108,
            "type": "treeFrog(8)"
        },
        {
            "id": 2311,
            "rarity": 108,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2553,
            "rarity": 108,
            "type": "croaking"
        },
        {
            "id": 2624,
            "rarity": 108,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2751,
            "rarity": 108,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3395,
            "rarity": 108,
            "type": "brownTreeFrog"
        },
        {
            "id": 3482,
            "rarity": 108,
            "type": "goldenTreeFrog"
        },
        {
            "id": 3526,
            "rarity": 108,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 84,
            "rarity": 107,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1232,
            "rarity": 107,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1476,
            "rarity": 107,
            "type": "treeFrog(8)"
        },
        {
            "id": 2015,
            "rarity": 107,
            "type": "treeFrog(8)"
        },
        {
            "id": 2247,
            "rarity": 107,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2299,
            "rarity": 107,
            "type": "brownTreeFrog"
        },
        {
            "id": 2310,
            "rarity": 107,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2392,
            "rarity": 107,
            "type": "croaking"
        },
        {
            "id": 2941,
            "rarity": 107,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3312,
            "rarity": 107,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3642,
            "rarity": 107,
            "type": "treeFrog(6)"
        },
        {
            "id": 3818,
            "rarity": 107,
            "type": "treeFrog(1)"
        },
        {
            "id": 665,
            "rarity": 106,
            "type": "treeFrog(2)"
        },
        {
            "id": 770,
            "rarity": 106,
            "type": "treeFrog(2)"
        },
        {
            "id": 1280,
            "rarity": 106,
            "type": "brownTreeFrog"
        },
        {
            "id": 1457,
            "rarity": 106,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1661,
            "rarity": 106,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1976,
            "rarity": 106,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2673,
            "rarity": 106,
            "type": "treeFrog(2)"
        },
        {
            "id": 3310,
            "rarity": 106,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3979,
            "rarity": 106,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1142,
            "rarity": 105,
            "type": "closedEyes"
        },
        {
            "id": 1588,
            "rarity": 105,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1599,
            "rarity": 105,
            "type": "treeFrog(7)"
        },
        {
            "id": 1685,
            "rarity": 105,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2560,
            "rarity": 105,
            "type": "treeFrog(6)"
        },
        {
            "id": 3617,
            "rarity": 105,
            "type": "treeFrog(3)"
        },
        {
            "id": 152,
            "rarity": 104,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 306,
            "rarity": 104,
            "type": "treeFrog(5)"
        },
        {
            "id": 794,
            "rarity": 104,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2340,
            "rarity": 104,
            "type": "treeFrog(1)"
        },
        {
            "id": 2516,
            "rarity": 104,
            "type": "brownTreeFrog"
        },
        {
            "id": 3099,
            "rarity": 104,
            "type": "brownTreeFrog"
        },
        {
            "id": 3646,
            "rarity": 104,
            "type": "treeFrog(2)"
        },
        {
            "id": 3771,
            "rarity": 104,
            "type": "treeFrog(7)"
        },
        {
            "id": 4013,
            "rarity": 104,
            "type": "treeFrog(3)"
        },
        {
            "id": 24,
            "rarity": 103,
            "type": "treeFrog(3)"
        },
        {
            "id": 304,
            "rarity": 103,
            "type": "treeFrog(8)"
        },
        {
            "id": 455,
            "rarity": 103,
            "type": "treeFrog(1)"
        },
        {
            "id": 854,
            "rarity": 103,
            "type": "treeFrog(2)"
        },
        {
            "id": 1264,
            "rarity": 103,
            "type": "treeFrog(1)"
        },
        {
            "id": 1369,
            "rarity": 103,
            "type": "treeFrog(2)"
        },
        {
            "id": 2619,
            "rarity": 103,
            "type": "treeFrog(2)"
        },
        {
            "id": 2891,
            "rarity": 103,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3478,
            "rarity": 103,
            "type": "treeFrog(1)"
        },
        {
            "id": 3620,
            "rarity": 103,
            "type": "splendidLeafFrog"
        },
        {
            "id": 211,
            "rarity": 102,
            "type": "treeFrog(1)"
        },
        {
            "id": 312,
            "rarity": 102,
            "type": "treeFrog(4)"
        },
        {
            "id": 976,
            "rarity": 102,
            "type": "treeFrog(2)"
        },
        {
            "id": 1087,
            "rarity": 102,
            "type": "croaking"
        },
        {
            "id": 1766,
            "rarity": 102,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2095,
            "rarity": 102,
            "type": "treeFrog(4)"
        },
        {
            "id": 2358,
            "rarity": 102,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2683,
            "rarity": 102,
            "type": "goldenTreeFrog"
        },
        {
            "id": 3015,
            "rarity": 102,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3172,
            "rarity": 102,
            "type": "treeFrog(2)"
        },
        {
            "id": 3354,
            "rarity": 102,
            "type": "treeFrog(2)"
        },
        {
            "id": 3417,
            "rarity": 102,
            "type": "treeFrog(3)"
        },
        {
            "id": 3493,
            "rarity": 102,
            "type": "stawberryDartFrog"
        },
        {
            "id": 4011,
            "rarity": 102,
            "type": "treeFrog(4)"
        },
        {
            "id": 163,
            "rarity": 101,
            "type": "goldenTreeFrog"
        },
        {
            "id": 174,
            "rarity": 101,
            "type": "treeFrog(2)"
        },
        {
            "id": 547,
            "rarity": 101,
            "type": "treeFrog(6)"
        },
        {
            "id": 655,
            "rarity": 101,
            "type": "treeFrog(3)"
        },
        {
            "id": 1133,
            "rarity": 101,
            "type": "blueDartFrog"
        },
        {
            "id": 1162,
            "rarity": 101,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1215,
            "rarity": 101,
            "type": "treeFrog(4)"
        },
        {
            "id": 1263,
            "rarity": 101,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1358,
            "rarity": 101,
            "type": "treeFrog(2)"
        },
        {
            "id": 1387,
            "rarity": 101,
            "type": "treeFrog(1)"
        },
        {
            "id": 1524,
            "rarity": 101,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1637,
            "rarity": 101,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1751,
            "rarity": 101,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1886,
            "rarity": 101,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2111,
            "rarity": 101,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2366,
            "rarity": 101,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2909,
            "rarity": 101,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2918,
            "rarity": 101,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3730,
            "rarity": 101,
            "type": "treeFrog(3)"
        },
        {
            "id": 3923,
            "rarity": 101,
            "type": "treeFrog(4)"
        },
        {
            "id": 90,
            "rarity": 100,
            "type": "treeFrog(2)"
        },
        {
            "id": 592,
            "rarity": 100,
            "type": "pinkTreeFrog"
        },
        {
            "id": 736,
            "rarity": 100,
            "type": "treeFrog(2)"
        },
        {
            "id": 781,
            "rarity": 100,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1013,
            "rarity": 100,
            "type": "treeFrog(5)"
        },
        {
            "id": 1033,
            "rarity": 100,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1170,
            "rarity": 100,
            "type": "treeFrog(2)"
        },
        {
            "id": 1291,
            "rarity": 100,
            "type": "treeFrog(2)"
        },
        {
            "id": 1469,
            "rarity": 100,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1827,
            "rarity": 100,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1854,
            "rarity": 100,
            "type": "treeFrog(2)"
        },
        {
            "id": 2315,
            "rarity": 100,
            "type": "blueDartFrog"
        },
        {
            "id": 2402,
            "rarity": 100,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2552,
            "rarity": 100,
            "type": "treeFrog(2)"
        },
        {
            "id": 2588,
            "rarity": 100,
            "type": "treeFrog(2)"
        },
        {
            "id": 2599,
            "rarity": 100,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2705,
            "rarity": 100,
            "type": "goldenTreeFrog"
        },
        {
            "id": 3100,
            "rarity": 100,
            "type": "blueDartFrog"
        },
        {
            "id": 3215,
            "rarity": 100,
            "type": "treeFrog(2)"
        },
        {
            "id": 3293,
            "rarity": 100,
            "type": "treeFrog(1)"
        },
        {
            "id": 3885,
            "rarity": 100,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3994,
            "rarity": 100,
            "type": "treeFrog(2)"
        },
        {
            "id": 40,
            "rarity": 99,
            "type": "treeFrog(2)"
        },
        {
            "id": 109,
            "rarity": 99,
            "type": "goldenTreeFrog"
        },
        {
            "id": 129,
            "rarity": 99,
            "type": "treeFrog(2)"
        },
        {
            "id": 147,
            "rarity": 99,
            "type": "treeFrog(2)"
        },
        {
            "id": 403,
            "rarity": 99,
            "type": "treeFrog(3)"
        },
        {
            "id": 437,
            "rarity": 99,
            "type": "purpleTreeFrog"
        },
        {
            "id": 575,
            "rarity": 99,
            "type": "treeFrog(3)"
        },
        {
            "id": 591,
            "rarity": 99,
            "type": "treeFrog(2)"
        },
        {
            "id": 623,
            "rarity": 99,
            "type": "treeFrog(2)"
        },
        {
            "id": 713,
            "rarity": 99,
            "type": "tomatoFrog"
        },
        {
            "id": 802,
            "rarity": 99,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1048,
            "rarity": 99,
            "type": "grayTreeFrog"
        },
        {
            "id": 1067,
            "rarity": 99,
            "type": "inversedEyes"
        },
        {
            "id": 1289,
            "rarity": 99,
            "type": "treeFrog(2)"
        },
        {
            "id": 1410,
            "rarity": 99,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1565,
            "rarity": 99,
            "type": "treeFrog(2)"
        },
        {
            "id": 1662,
            "rarity": 99,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1741,
            "rarity": 99,
            "type": "treeFrog(2)"
        },
        {
            "id": 1825,
            "rarity": 99,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2406,
            "rarity": 99,
            "type": "treeFrog(2)"
        },
        {
            "id": 2454,
            "rarity": 99,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2521,
            "rarity": 99,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2554,
            "rarity": 99,
            "type": "treeFrog(4)"
        },
        {
            "id": 2688,
            "rarity": 99,
            "type": "splendidLeafFrog"
        },
        {
            "id": 2750,
            "rarity": 99,
            "type": "treeFrog(2)"
        },
        {
            "id": 2983,
            "rarity": 99,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3022,
            "rarity": 99,
            "type": "treeFrog(5)"
        },
        {
            "id": 3222,
            "rarity": 99,
            "type": "treeFrog(5)"
        },
        {
            "id": 3235,
            "rarity": 99,
            "type": "treeFrog(2)"
        },
        {
            "id": 3250,
            "rarity": 99,
            "type": "blueDartFrog"
        },
        {
            "id": 3261,
            "rarity": 99,
            "type": "treeFrog(2)"
        },
        {
            "id": 3402,
            "rarity": 99,
            "type": "treeFrog(2)"
        },
        {
            "id": 3852,
            "rarity": 99,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3864,
            "rarity": 99,
            "type": "treeFrog(1)"
        },
        {
            "id": 3910,
            "rarity": 99,
            "type": "pinkTreeFrog"
        },
        {
            "id": 4017,
            "rarity": 99,
            "type": "purpleTreeFrog"
        },
        {
            "id": 4034,
            "rarity": 99,
            "type": "orangeTreeFrog"
        },
        {
            "id": 7,
            "rarity": 98,
            "type": "treeFrog(1)"
        },
        {
            "id": 298,
            "rarity": 98,
            "type": "splendidLeafFrog"
        },
        {
            "id": 345,
            "rarity": 98,
            "type": "treeFrog(2)"
        },
        {
            "id": 472,
            "rarity": 98,
            "type": "goldenTreeFrog"
        },
        {
            "id": 578,
            "rarity": 98,
            "type": "treeFrog(4)"
        },
        {
            "id": 642,
            "rarity": 98,
            "type": "treeFrog(2)"
        },
        {
            "id": 868,
            "rarity": 98,
            "type": "blueDartFrog"
        },
        {
            "id": 1018,
            "rarity": 98,
            "type": "treeFrog(5)"
        },
        {
            "id": 1057,
            "rarity": 98,
            "type": "treeFrog(8)"
        },
        {
            "id": 1099,
            "rarity": 98,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1132,
            "rarity": 98,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1188,
            "rarity": 98,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1210,
            "rarity": 98,
            "type": "greenTreeFrog"
        },
        {
            "id": 1231,
            "rarity": 98,
            "type": "treeFrog(3)"
        },
        {
            "id": 1337,
            "rarity": 98,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1356,
            "rarity": 98,
            "type": "treeFrog(8)"
        },
        {
            "id": 1394,
            "rarity": 98,
            "type": "blueTreeFrog"
        },
        {
            "id": 1450,
            "rarity": 98,
            "type": "treeFrog(4)"
        },
        {
            "id": 1477,
            "rarity": 98,
            "type": "treeFrog(2)"
        },
        {
            "id": 1479,
            "rarity": 98,
            "type": "blueDartFrog"
        },
        {
            "id": 1561,
            "rarity": 98,
            "type": "treeFrog(2)"
        },
        {
            "id": 1957,
            "rarity": 98,
            "type": "treeFrog(2)"
        },
        {
            "id": 2045,
            "rarity": 98,
            "type": "splendidLeafFrog"
        },
        {
            "id": 2061,
            "rarity": 98,
            "type": "treeFrog(2)"
        },
        {
            "id": 2176,
            "rarity": 98,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2217,
            "rarity": 98,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2250,
            "rarity": 98,
            "type": "treeFrog(2)"
        },
        {
            "id": 2572,
            "rarity": 98,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2626,
            "rarity": 98,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2684,
            "rarity": 98,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2964,
            "rarity": 98,
            "type": "treeFrog(2)"
        },
        {
            "id": 3045,
            "rarity": 98,
            "type": "treeFrog(3)"
        },
        {
            "id": 3097,
            "rarity": 98,
            "type": "tomatoFrog"
        },
        {
            "id": 3188,
            "rarity": 98,
            "type": "treeFrog(5)"
        },
        {
            "id": 3251,
            "rarity": 98,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3387,
            "rarity": 98,
            "type": "treeFrog(4)"
        },
        {
            "id": 3448,
            "rarity": 98,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3470,
            "rarity": 98,
            "type": "treeFrog(1)"
        },
        {
            "id": 3564,
            "rarity": 98,
            "type": "treeFrog(2)"
        },
        {
            "id": 3576,
            "rarity": 98,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3738,
            "rarity": 98,
            "type": "treeFrog(3)"
        },
        {
            "id": 3819,
            "rarity": 98,
            "type": "stawberryDartFrog"
        },
        {
            "id": 3838,
            "rarity": 98,
            "type": "treeFrog(4)"
        },
        {
            "id": 3894,
            "rarity": 98,
            "type": "treeFrog(5)"
        },
        {
            "id": 337,
            "rarity": 97,
            "type": "blueDartFrog"
        },
        {
            "id": 348,
            "rarity": 97,
            "type": "treeFrog(3)"
        },
        {
            "id": 395,
            "rarity": 97,
            "type": "treeFrog(2)"
        },
        {
            "id": 498,
            "rarity": 97,
            "type": "treeFrog(2)"
        },
        {
            "id": 668,
            "rarity": 97,
            "type": "treeFrog(3)"
        },
        {
            "id": 908,
            "rarity": 97,
            "type": "treeFrog(2)"
        },
        {
            "id": 956,
            "rarity": 97,
            "type": "treeFrog(2)"
        },
        {
            "id": 1037,
            "rarity": 97,
            "type": "treeFrog(4)"
        },
        {
            "id": 1203,
            "rarity": 97,
            "type": "treeFrog(5)"
        },
        {
            "id": 1208,
            "rarity": 97,
            "type": "tomatoFrog"
        },
        {
            "id": 1466,
            "rarity": 97,
            "type": "treeFrog(2)"
        },
        {
            "id": 1504,
            "rarity": 97,
            "type": "treeFrog(2)"
        },
        {
            "id": 1564,
            "rarity": 97,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1634,
            "rarity": 97,
            "type": "treeFrog(3)"
        },
        {
            "id": 1640,
            "rarity": 97,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1674,
            "rarity": 97,
            "type": "blueDartFrog"
        },
        {
            "id": 1747,
            "rarity": 97,
            "type": "treeFrog(2)"
        },
        {
            "id": 1844,
            "rarity": 97,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1864,
            "rarity": 97,
            "type": "treeFrog(2)"
        },
        {
            "id": 1974,
            "rarity": 97,
            "type": "treeFrog(4)"
        },
        {
            "id": 2030,
            "rarity": 97,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2126,
            "rarity": 97,
            "type": "treeFrog(2)"
        },
        {
            "id": 2197,
            "rarity": 97,
            "type": "treeFrog(2)"
        },
        {
            "id": 2323,
            "rarity": 97,
            "type": "splendidLeafFrog"
        },
        {
            "id": 2532,
            "rarity": 97,
            "type": "treeFrog(3)"
        },
        {
            "id": 2638,
            "rarity": 97,
            "type": "treeFrog(2)"
        },
        {
            "id": 2670,
            "rarity": 97,
            "type": "treeFrog(2)"
        },
        {
            "id": 2707,
            "rarity": 97,
            "type": "treeFrog(3)"
        },
        {
            "id": 2741,
            "rarity": 97,
            "type": "grayTreeFrog"
        },
        {
            "id": 2759,
            "rarity": 97,
            "type": "treeFrog(2)"
        },
        {
            "id": 2865,
            "rarity": 97,
            "type": "treeFrog(3)"
        },
        {
            "id": 3030,
            "rarity": 97,
            "type": "treeFrog(6)"
        },
        {
            "id": 3130,
            "rarity": 97,
            "type": "thirdEye"
        },
        {
            "id": 3262,
            "rarity": 97,
            "type": "treeFrog(2)"
        },
        {
            "id": 3274,
            "rarity": 97,
            "type": "blueTreeFrog"
        },
        {
            "id": 3447,
            "rarity": 97,
            "type": "treeFrog(2)"
        },
        {
            "id": 3823,
            "rarity": 97,
            "type": "blueTreeFrog"
        },
        {
            "id": 3858,
            "rarity": 97,
            "type": "treeFrog(3)"
        },
        {
            "id": 11,
            "rarity": 96,
            "type": "greenTreeFrog"
        },
        {
            "id": 63,
            "rarity": 96,
            "type": "tomatoFrog"
        },
        {
            "id": 197,
            "rarity": 96,
            "type": "treeFrog(6)"
        },
        {
            "id": 282,
            "rarity": 96,
            "type": "pinkTreeFrog"
        },
        {
            "id": 285,
            "rarity": 96,
            "type": "splendidLeafFrog"
        },
        {
            "id": 459,
            "rarity": 96,
            "type": "treeFrog(3)"
        },
        {
            "id": 612,
            "rarity": 96,
            "type": "blueTreeFrog"
        },
        {
            "id": 692,
            "rarity": 96,
            "type": "treeFrog(4)"
        },
        {
            "id": 696,
            "rarity": 96,
            "type": "treeFrog(7)"
        },
        {
            "id": 787,
            "rarity": 96,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1026,
            "rarity": 96,
            "type": "treeFrog(3)"
        },
        {
            "id": 1127,
            "rarity": 96,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1158,
            "rarity": 96,
            "type": "treeFrog(2)"
        },
        {
            "id": 1259,
            "rarity": 96,
            "type": "treeFrog(4)"
        },
        {
            "id": 1281,
            "rarity": 96,
            "type": "treeFrog(3)"
        },
        {
            "id": 1362,
            "rarity": 96,
            "type": "greenTreeFrog"
        },
        {
            "id": 1612,
            "rarity": 96,
            "type": "treeFrog(5)"
        },
        {
            "id": 1777,
            "rarity": 96,
            "type": "treeFrog(3)"
        },
        {
            "id": 1812,
            "rarity": 96,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1900,
            "rarity": 96,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1935,
            "rarity": 96,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1955,
            "rarity": 96,
            "type": "treeFrog(2)"
        },
        {
            "id": 2033,
            "rarity": 96,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2062,
            "rarity": 96,
            "type": "grayTreeFrog"
        },
        {
            "id": 2127,
            "rarity": 96,
            "type": "blueDartFrog"
        },
        {
            "id": 2135,
            "rarity": 96,
            "type": "treeFrog(3)"
        },
        {
            "id": 2215,
            "rarity": 96,
            "type": "tomatoFrog"
        },
        {
            "id": 2329,
            "rarity": 96,
            "type": "greenTreeFrog"
        },
        {
            "id": 2437,
            "rarity": 96,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2446,
            "rarity": 96,
            "type": "treeFrog(2)"
        },
        {
            "id": 2515,
            "rarity": 96,
            "type": "treeFrog(7)"
        },
        {
            "id": 2646,
            "rarity": 96,
            "type": "treeFrog(3)"
        },
        {
            "id": 2689,
            "rarity": 96,
            "type": "treeFrog(5)"
        },
        {
            "id": 2721,
            "rarity": 96,
            "type": "blueTreeFrog"
        },
        {
            "id": 2731,
            "rarity": 96,
            "type": "treeFrog(2)"
        },
        {
            "id": 2842,
            "rarity": 96,
            "type": "treeFrog(1)"
        },
        {
            "id": 2872,
            "rarity": 96,
            "type": "treeFrog(3)"
        },
        {
            "id": 2893,
            "rarity": 96,
            "type": "treeFrog(3)"
        },
        {
            "id": 3016,
            "rarity": 96,
            "type": "treeFrog(3)"
        },
        {
            "id": 3068,
            "rarity": 96,
            "type": "blueTreeFrog"
        },
        {
            "id": 3151,
            "rarity": 96,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3192,
            "rarity": 96,
            "type": "treeFrog(2)"
        },
        {
            "id": 3297,
            "rarity": 96,
            "type": "blueDartFrog"
        },
        {
            "id": 3330,
            "rarity": 96,
            "type": "treeFrog(3)"
        },
        {
            "id": 3401,
            "rarity": 96,
            "type": "tomatoFrog"
        },
        {
            "id": 3477,
            "rarity": 96,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3495,
            "rarity": 96,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3510,
            "rarity": 96,
            "type": "grayTreeFrog"
        },
        {
            "id": 3704,
            "rarity": 96,
            "type": "treeFrog(2)"
        },
        {
            "id": 3710,
            "rarity": 96,
            "type": "greenTreeFrog"
        },
        {
            "id": 3729,
            "rarity": 96,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3751,
            "rarity": 96,
            "type": "treeFrog(2)"
        },
        {
            "id": 3901,
            "rarity": 96,
            "type": "treeFrog(6)"
        },
        {
            "id": 22,
            "rarity": 95,
            "type": "tomatoFrog"
        },
        {
            "id": 53,
            "rarity": 95,
            "type": "blueTreeFrog"
        },
        {
            "id": 94,
            "rarity": 95,
            "type": "treeFrog(3)"
        },
        {
            "id": 128,
            "rarity": 95,
            "type": "treeFrog(4)"
        },
        {
            "id": 184,
            "rarity": 95,
            "type": "goldenDartFrog"
        },
        {
            "id": 233,
            "rarity": 95,
            "type": "treeFrog(3)"
        },
        {
            "id": 300,
            "rarity": 95,
            "type": "stawberryDartFrog"
        },
        {
            "id": 399,
            "rarity": 95,
            "type": "treeFrog(3)"
        },
        {
            "id": 595,
            "rarity": 95,
            "type": "treeFrog(4)"
        },
        {
            "id": 725,
            "rarity": 95,
            "type": "brownTreeFrog"
        },
        {
            "id": 910,
            "rarity": 95,
            "type": "treeFrog(4)"
        },
        {
            "id": 917,
            "rarity": 95,
            "type": "unknown"
        },
        {
            "id": 960,
            "rarity": 95,
            "type": "treeFrog(4)"
        },
        {
            "id": 996,
            "rarity": 95,
            "type": "treeFrog(4)"
        },
        {
            "id": 1055,
            "rarity": 95,
            "type": "treeFrog(3)"
        },
        {
            "id": 1155,
            "rarity": 95,
            "type": "treeFrog(1)"
        },
        {
            "id": 1169,
            "rarity": 95,
            "type": "treeFrog(2)"
        },
        {
            "id": 1278,
            "rarity": 95,
            "type": "treeFrog(8)"
        },
        {
            "id": 1329,
            "rarity": 95,
            "type": "treeFrog(3)"
        },
        {
            "id": 1330,
            "rarity": 95,
            "type": "treeFrog(2)"
        },
        {
            "id": 1364,
            "rarity": 95,
            "type": "treeFrog(3)"
        },
        {
            "id": 1527,
            "rarity": 95,
            "type": "treeFrog(7)"
        },
        {
            "id": 1558,
            "rarity": 95,
            "type": "blueDartFrog"
        },
        {
            "id": 1659,
            "rarity": 95,
            "type": "treeFrog(1)"
        },
        {
            "id": 1749,
            "rarity": 95,
            "type": "unknown"
        },
        {
            "id": 1791,
            "rarity": 95,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2012,
            "rarity": 95,
            "type": "treeFrog(5)"
        },
        {
            "id": 2160,
            "rarity": 95,
            "type": "blueDartFrog"
        },
        {
            "id": 2201,
            "rarity": 95,
            "type": "treeFrog(1)"
        },
        {
            "id": 2259,
            "rarity": 95,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2292,
            "rarity": 95,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2326,
            "rarity": 95,
            "type": "treeFrog(2)"
        },
        {
            "id": 2339,
            "rarity": 95,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2434,
            "rarity": 95,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2604,
            "rarity": 95,
            "type": "treeFrog(1)"
        },
        {
            "id": 2722,
            "rarity": 95,
            "type": "unknown"
        },
        {
            "id": 2723,
            "rarity": 95,
            "type": "treeFrog(3)"
        },
        {
            "id": 2746,
            "rarity": 95,
            "type": "treeFrog(5)"
        },
        {
            "id": 2818,
            "rarity": 95,
            "type": "treeFrog(1)"
        },
        {
            "id": 2922,
            "rarity": 95,
            "type": "goldenTreeFrog"
        },
        {
            "id": 3028,
            "rarity": 95,
            "type": "treeFrog(3)"
        },
        {
            "id": 3115,
            "rarity": 95,
            "type": "treeFrog(2)"
        },
        {
            "id": 3147,
            "rarity": 95,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3175,
            "rarity": 95,
            "type": "treeFrog(2)"
        },
        {
            "id": 3194,
            "rarity": 95,
            "type": "treeFrog(6)"
        },
        {
            "id": 3200,
            "rarity": 95,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3201,
            "rarity": 95,
            "type": "treeFrog(6)"
        },
        {
            "id": 3244,
            "rarity": 95,
            "type": "goldenTreeFrog"
        },
        {
            "id": 3258,
            "rarity": 95,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3356,
            "rarity": 95,
            "type": "treeFrog(3)"
        },
        {
            "id": 3416,
            "rarity": 95,
            "type": "blueDartFrog"
        },
        {
            "id": 3681,
            "rarity": 95,
            "type": "treeFrog(3)"
        },
        {
            "id": 3682,
            "rarity": 95,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3756,
            "rarity": 95,
            "type": "treeFrog(6)"
        },
        {
            "id": 3912,
            "rarity": 95,
            "type": "treeFrog(3)"
        },
        {
            "id": 3986,
            "rarity": 95,
            "type": "treeFrog(2)"
        },
        {
            "id": 3988,
            "rarity": 95,
            "type": "treeFrog(7)"
        },
        {
            "id": 2,
            "rarity": 94,
            "type": "treeFrog(5)"
        },
        {
            "id": 9,
            "rarity": 94,
            "type": "treeFrog(4)"
        },
        {
            "id": 368,
            "rarity": 94,
            "type": "unknown"
        },
        {
            "id": 383,
            "rarity": 94,
            "type": "treeFrog(4)"
        },
        {
            "id": 460,
            "rarity": 94,
            "type": "treeFrog(2)"
        },
        {
            "id": 489,
            "rarity": 94,
            "type": "treeFrog(4)"
        },
        {
            "id": 693,
            "rarity": 94,
            "type": "treeFrog(3)"
        },
        {
            "id": 774,
            "rarity": 94,
            "type": "treeFrog(3)"
        },
        {
            "id": 1226,
            "rarity": 94,
            "type": "grayTreeFrog"
        },
        {
            "id": 1255,
            "rarity": 94,
            "type": "treeFrog(3)"
        },
        {
            "id": 1276,
            "rarity": 94,
            "type": "treeFrog(7)"
        },
        {
            "id": 1413,
            "rarity": 94,
            "type": "treeFrog(3)"
        },
        {
            "id": 1417,
            "rarity": 94,
            "type": "greenTreeFrog"
        },
        {
            "id": 1463,
            "rarity": 94,
            "type": "treeFrog(6)"
        },
        {
            "id": 1532,
            "rarity": 94,
            "type": "treeFrog(3)"
        },
        {
            "id": 1563,
            "rarity": 94,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1578,
            "rarity": 94,
            "type": "treeFrog(6)"
        },
        {
            "id": 1643,
            "rarity": 94,
            "type": "goldenDartFrog"
        },
        {
            "id": 1691,
            "rarity": 94,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1786,
            "rarity": 94,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1830,
            "rarity": 94,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1911,
            "rarity": 94,
            "type": "treeFrog(3)"
        },
        {
            "id": 2013,
            "rarity": 94,
            "type": "treeFrog(2)"
        },
        {
            "id": 2064,
            "rarity": 94,
            "type": "treeFrog(8)"
        },
        {
            "id": 2068,
            "rarity": 94,
            "type": "treeFrog(7)"
        },
        {
            "id": 2094,
            "rarity": 94,
            "type": "unknown"
        },
        {
            "id": 2103,
            "rarity": 94,
            "type": "treeFrog(7)"
        },
        {
            "id": 2108,
            "rarity": 94,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2122,
            "rarity": 94,
            "type": "treeFrog(5)"
        },
        {
            "id": 2165,
            "rarity": 94,
            "type": "treeFrog(3)"
        },
        {
            "id": 2169,
            "rarity": 94,
            "type": "treeFrog(3)"
        },
        {
            "id": 2227,
            "rarity": 94,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2232,
            "rarity": 94,
            "type": "treeFrog(3)"
        },
        {
            "id": 2440,
            "rarity": 94,
            "type": "treeFrog(3)"
        },
        {
            "id": 2442,
            "rarity": 94,
            "type": "treeFrog(3)"
        },
        {
            "id": 2718,
            "rarity": 94,
            "type": "treeFrog(7)"
        },
        {
            "id": 2790,
            "rarity": 94,
            "type": "treeFrog(3)"
        },
        {
            "id": 2823,
            "rarity": 94,
            "type": "treeFrog(5)"
        },
        {
            "id": 2900,
            "rarity": 94,
            "type": "treeFrog(7)"
        },
        {
            "id": 2969,
            "rarity": 94,
            "type": "treeFrog(1)"
        },
        {
            "id": 3118,
            "rarity": 94,
            "type": "treeFrog(3)"
        },
        {
            "id": 3141,
            "rarity": 94,
            "type": "treeFrog(3)"
        },
        {
            "id": 3156,
            "rarity": 94,
            "type": "treeFrog(4)"
        },
        {
            "id": 3218,
            "rarity": 94,
            "type": "unknown"
        },
        {
            "id": 3268,
            "rarity": 94,
            "type": "treeFrog(1)"
        },
        {
            "id": 3363,
            "rarity": 94,
            "type": "treeFrog(3)"
        },
        {
            "id": 3364,
            "rarity": 94,
            "type": "blueTreeFrog"
        },
        {
            "id": 3436,
            "rarity": 94,
            "type": "treeFrog(7)"
        },
        {
            "id": 3714,
            "rarity": 94,
            "type": "treeFrog(5)"
        },
        {
            "id": 3722,
            "rarity": 94,
            "type": "treeFrog(3)"
        },
        {
            "id": 3736,
            "rarity": 94,
            "type": "treeFrog(8)"
        },
        {
            "id": 3791,
            "rarity": 94,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3817,
            "rarity": 94,
            "type": "treeFrog(4)"
        },
        {
            "id": 3827,
            "rarity": 94,
            "type": "treeFrog(8)"
        },
        {
            "id": 3966,
            "rarity": 94,
            "type": "treeFrog(1)"
        },
        {
            "id": 76,
            "rarity": 93,
            "type": "treeFrog(5)"
        },
        {
            "id": 78,
            "rarity": 93,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 93,
            "rarity": 93,
            "type": "goldenTreeFrog"
        },
        {
            "id": 187,
            "rarity": 93,
            "type": "goldenDartFrog"
        },
        {
            "id": 308,
            "rarity": 93,
            "type": "grayTreeFrog"
        },
        {
            "id": 323,
            "rarity": 93,
            "type": "treeFrog(5)"
        },
        {
            "id": 355,
            "rarity": 93,
            "type": "stawberryDartFrog"
        },
        {
            "id": 380,
            "rarity": 93,
            "type": "treeFrog(8)"
        },
        {
            "id": 417,
            "rarity": 93,
            "type": "purpleTreeFrog"
        },
        {
            "id": 461,
            "rarity": 93,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 510,
            "rarity": 93,
            "type": "treeFrog(6)"
        },
        {
            "id": 590,
            "rarity": 93,
            "type": "treeFrog(6)"
        },
        {
            "id": 645,
            "rarity": 93,
            "type": "treeFrog(4)"
        },
        {
            "id": 783,
            "rarity": 93,
            "type": "treeFrog(7)"
        },
        {
            "id": 920,
            "rarity": 93,
            "type": "blueDartFrog"
        },
        {
            "id": 968,
            "rarity": 93,
            "type": "treeFrog(4)"
        },
        {
            "id": 986,
            "rarity": 93,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1040,
            "rarity": 93,
            "type": "blueDartFrog"
        },
        {
            "id": 1083,
            "rarity": 93,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1113,
            "rarity": 93,
            "type": "treeFrog(4)"
        },
        {
            "id": 1207,
            "rarity": 93,
            "type": "treeFrog(3)"
        },
        {
            "id": 1240,
            "rarity": 93,
            "type": "treeFrog(3)"
        },
        {
            "id": 1270,
            "rarity": 93,
            "type": "grayTreeFrog"
        },
        {
            "id": 1382,
            "rarity": 93,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1451,
            "rarity": 93,
            "type": "blueTreeFrog"
        },
        {
            "id": 1506,
            "rarity": 93,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1530,
            "rarity": 93,
            "type": "tomatoFrog"
        },
        {
            "id": 1544,
            "rarity": 93,
            "type": "grayTreeFrog"
        },
        {
            "id": 1602,
            "rarity": 93,
            "type": "treeFrog(3)"
        },
        {
            "id": 1689,
            "rarity": 93,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1950,
            "rarity": 93,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1995,
            "rarity": 93,
            "type": "tomatoFrog"
        },
        {
            "id": 2087,
            "rarity": 93,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2140,
            "rarity": 93,
            "type": "treeFrog(6)"
        },
        {
            "id": 2144,
            "rarity": 93,
            "type": "treeFrog(4)"
        },
        {
            "id": 2147,
            "rarity": 93,
            "type": "tomatoFrog"
        },
        {
            "id": 2234,
            "rarity": 93,
            "type": "treeFrog(4)"
        },
        {
            "id": 2256,
            "rarity": 93,
            "type": "treeFrog(6)"
        },
        {
            "id": 2322,
            "rarity": 93,
            "type": "treeFrog(5)"
        },
        {
            "id": 2328,
            "rarity": 93,
            "type": "treeFrog(2)"
        },
        {
            "id": 2398,
            "rarity": 93,
            "type": "treeFrog(5)"
        },
        {
            "id": 2415,
            "rarity": 93,
            "type": "greenTreeFrog"
        },
        {
            "id": 2421,
            "rarity": 93,
            "type": "treeFrog(4)"
        },
        {
            "id": 2494,
            "rarity": 93,
            "type": "treeFrog(8)"
        },
        {
            "id": 2531,
            "rarity": 93,
            "type": "grayTreeFrog"
        },
        {
            "id": 2564,
            "rarity": 93,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2685,
            "rarity": 93,
            "type": "treeFrog(8)"
        },
        {
            "id": 2695,
            "rarity": 93,
            "type": "treeFrog(3)"
        },
        {
            "id": 2703,
            "rarity": 93,
            "type": "treeFrog(3)"
        },
        {
            "id": 2724,
            "rarity": 93,
            "type": "treeFrog(6)"
        },
        {
            "id": 2756,
            "rarity": 93,
            "type": "treeFrog(2)"
        },
        {
            "id": 2763,
            "rarity": 93,
            "type": "blueDartFrog"
        },
        {
            "id": 2814,
            "rarity": 93,
            "type": "treeFrog(3)"
        },
        {
            "id": 2828,
            "rarity": 93,
            "type": "treeFrog(4)"
        },
        {
            "id": 2883,
            "rarity": 93,
            "type": "treeFrog(3)"
        },
        {
            "id": 3041,
            "rarity": 93,
            "type": "treeFrog(5)"
        },
        {
            "id": 3059,
            "rarity": 93,
            "type": "greenTreeFrog"
        },
        {
            "id": 3114,
            "rarity": 93,
            "type": "treeFrog(3)"
        },
        {
            "id": 3144,
            "rarity": 93,
            "type": "treeFrog(1)"
        },
        {
            "id": 3273,
            "rarity": 93,
            "type": "treeFrog(5)"
        },
        {
            "id": 3278,
            "rarity": 93,
            "type": "goldenTreeFrog"
        },
        {
            "id": 3355,
            "rarity": 93,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3456,
            "rarity": 93,
            "type": "treeFrog(4)"
        },
        {
            "id": 3472,
            "rarity": 93,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3578,
            "rarity": 93,
            "type": "tomatoFrog"
        },
        {
            "id": 3699,
            "rarity": 93,
            "type": "treeFrog(3)"
        },
        {
            "id": 3709,
            "rarity": 93,
            "type": "greenTreeFrog"
        },
        {
            "id": 3777,
            "rarity": 93,
            "type": "treeFrog(5)"
        },
        {
            "id": 3992,
            "rarity": 93,
            "type": "stawberryDartFrog"
        },
        {
            "id": 175,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 203,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 219,
            "rarity": 92,
            "type": "treeFrog(8)"
        },
        {
            "id": 258,
            "rarity": 92,
            "type": "unknown"
        },
        {
            "id": 260,
            "rarity": 92,
            "type": "grayTreeFrog"
        },
        {
            "id": 313,
            "rarity": 92,
            "type": "blueTreeFrog"
        },
        {
            "id": 376,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 442,
            "rarity": 92,
            "type": "treeFrog(2)"
        },
        {
            "id": 443,
            "rarity": 92,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 488,
            "rarity": 92,
            "type": "treeFrog(7)"
        },
        {
            "id": 509,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 532,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 534,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 539,
            "rarity": 92,
            "type": "stawberryDartFrog"
        },
        {
            "id": 555,
            "rarity": 92,
            "type": "treeFrog(2)"
        },
        {
            "id": 604,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 657,
            "rarity": 92,
            "type": "pinkTreeFrog"
        },
        {
            "id": 685,
            "rarity": 92,
            "type": "treeFrog(5)"
        },
        {
            "id": 694,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 695,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 704,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 759,
            "rarity": 92,
            "type": "purpleTreeFrog"
        },
        {
            "id": 798,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 813,
            "rarity": 92,
            "type": "treeFrog(8)"
        },
        {
            "id": 839,
            "rarity": 92,
            "type": "treeFrog(5)"
        },
        {
            "id": 842,
            "rarity": 92,
            "type": "treeFrog(2)"
        },
        {
            "id": 844,
            "rarity": 92,
            "type": "goldenDartFrog"
        },
        {
            "id": 977,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 1176,
            "rarity": 92,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1179,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 1187,
            "rarity": 92,
            "type": "blueTreeFrog"
        },
        {
            "id": 1214,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 1265,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 1275,
            "rarity": 92,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1340,
            "rarity": 92,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1357,
            "rarity": 92,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1418,
            "rarity": 92,
            "type": "unknown"
        },
        {
            "id": 1425,
            "rarity": 92,
            "type": "treeFrog(7)"
        },
        {
            "id": 1470,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 1516,
            "rarity": 92,
            "type": "treeFrog(1)"
        },
        {
            "id": 1529,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 1715,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 1746,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 1761,
            "rarity": 92,
            "type": "treeFrog(6)"
        },
        {
            "id": 1780,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 1787,
            "rarity": 92,
            "type": "grayTreeFrog"
        },
        {
            "id": 1824,
            "rarity": 92,
            "type": "treeFrog(6)"
        },
        {
            "id": 1838,
            "rarity": 92,
            "type": "treeFrog(7)"
        },
        {
            "id": 1867,
            "rarity": 92,
            "type": "treeFrog(5)"
        },
        {
            "id": 1878,
            "rarity": 92,
            "type": "greenTreeFrog"
        },
        {
            "id": 1913,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 2026,
            "rarity": 92,
            "type": "treeFrog(8)"
        },
        {
            "id": 2038,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 2055,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 2098,
            "rarity": 92,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2158,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 2162,
            "rarity": 92,
            "type": "treeFrog(7)"
        },
        {
            "id": 2291,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 2549,
            "rarity": 92,
            "type": "treeFrog(5)"
        },
        {
            "id": 2632,
            "rarity": 92,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2850,
            "rarity": 92,
            "type": "treeFrog(6)"
        },
        {
            "id": 2903,
            "rarity": 92,
            "type": "treeFrog(6)"
        },
        {
            "id": 2930,
            "rarity": 92,
            "type": "treeFrog(7)"
        },
        {
            "id": 2982,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 3026,
            "rarity": 92,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3061,
            "rarity": 92,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3064,
            "rarity": 92,
            "type": "treeFrog(1)"
        },
        {
            "id": 3087,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 3178,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 3180,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 3241,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 3284,
            "rarity": 92,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3333,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 3349,
            "rarity": 92,
            "type": "treeFrog(5)"
        },
        {
            "id": 3388,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 3567,
            "rarity": 92,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3583,
            "rarity": 92,
            "type": "treeFrog(5)"
        },
        {
            "id": 3612,
            "rarity": 92,
            "type": "treeFrog(7)"
        },
        {
            "id": 3628,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 3847,
            "rarity": 92,
            "type": "treeFrog(3)"
        },
        {
            "id": 3925,
            "rarity": 92,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3947,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 3960,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 4004,
            "rarity": 92,
            "type": "treeFrog(4)"
        },
        {
            "id": 13,
            "rarity": 91,
            "type": "purpleTreeFrog"
        },
        {
            "id": 85,
            "rarity": 91,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 207,
            "rarity": 91,
            "type": "stawberryDartFrog"
        },
        {
            "id": 214,
            "rarity": 91,
            "type": "blueDartFrog"
        },
        {
            "id": 250,
            "rarity": 91,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 328,
            "rarity": 91,
            "type": "treeFrog(4)"
        },
        {
            "id": 381,
            "rarity": 91,
            "type": "treeFrog(4)"
        },
        {
            "id": 413,
            "rarity": 91,
            "type": "treeFrog(1)"
        },
        {
            "id": 425,
            "rarity": 91,
            "type": "treeFrog(8)"
        },
        {
            "id": 463,
            "rarity": 91,
            "type": "purpleTreeFrog"
        },
        {
            "id": 584,
            "rarity": 91,
            "type": "treeFrog(5)"
        },
        {
            "id": 606,
            "rarity": 91,
            "type": "blueTreeFrog"
        },
        {
            "id": 676,
            "rarity": 91,
            "type": "blueDartFrog"
        },
        {
            "id": 740,
            "rarity": 91,
            "type": "treeFrog(4)"
        },
        {
            "id": 767,
            "rarity": 91,
            "type": "treeFrog(4)"
        },
        {
            "id": 772,
            "rarity": 91,
            "type": "treeFrog(3)"
        },
        {
            "id": 789,
            "rarity": 91,
            "type": "treeFrog(4)"
        },
        {
            "id": 852,
            "rarity": 91,
            "type": "treeFrog(6)"
        },
        {
            "id": 878,
            "rarity": 91,
            "type": "treeFrog(3)"
        },
        {
            "id": 879,
            "rarity": 91,
            "type": "treeFrog(8)"
        },
        {
            "id": 937,
            "rarity": 91,
            "type": "treeFrog(8)"
        },
        {
            "id": 944,
            "rarity": 91,
            "type": "treeFrog(6)"
        },
        {
            "id": 950,
            "rarity": 91,
            "type": "treeFrog(8)"
        },
        {
            "id": 1030,
            "rarity": 91,
            "type": "treeFrog(6)"
        },
        {
            "id": 1031,
            "rarity": 91,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1050,
            "rarity": 91,
            "type": "treeFrog(6)"
        },
        {
            "id": 1051,
            "rarity": 91,
            "type": "treeFrog(6)"
        },
        {
            "id": 1092,
            "rarity": 91,
            "type": "treeFrog(8)"
        },
        {
            "id": 1110,
            "rarity": 91,
            "type": "treeFrog(4)"
        },
        {
            "id": 1124,
            "rarity": 91,
            "type": "greenTreeFrog"
        },
        {
            "id": 1204,
            "rarity": 91,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1252,
            "rarity": 91,
            "type": "treeFrog(3)"
        },
        {
            "id": 1253,
            "rarity": 91,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1336,
            "rarity": 91,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1343,
            "rarity": 91,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1344,
            "rarity": 91,
            "type": "treeFrog(3)"
        },
        {
            "id": 1355,
            "rarity": 91,
            "type": "treeFrog(5)"
        },
        {
            "id": 1365,
            "rarity": 91,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1464,
            "rarity": 91,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1523,
            "rarity": 91,
            "type": "treeFrog(3)"
        },
        {
            "id": 1760,
            "rarity": 91,
            "type": "brownTreeFrog"
        },
        {
            "id": 1839,
            "rarity": 91,
            "type": "treeFrog(4)"
        },
        {
            "id": 1857,
            "rarity": 91,
            "type": "treeFrog(8)"
        },
        {
            "id": 1879,
            "rarity": 91,
            "type": "treeFrog(5)"
        },
        {
            "id": 2040,
            "rarity": 91,
            "type": "treeFrog(7)"
        },
        {
            "id": 2084,
            "rarity": 91,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2099,
            "rarity": 91,
            "type": "treeFrog(3)"
        },
        {
            "id": 2177,
            "rarity": 91,
            "type": "treeFrog(3)"
        },
        {
            "id": 2211,
            "rarity": 91,
            "type": "treeFrog(3)"
        },
        {
            "id": 2262,
            "rarity": 91,
            "type": "treeFrog(5)"
        },
        {
            "id": 2283,
            "rarity": 91,
            "type": "treeFrog(5)"
        },
        {
            "id": 2435,
            "rarity": 91,
            "type": "treeFrog(7)"
        },
        {
            "id": 2502,
            "rarity": 91,
            "type": "treeFrog(2)"
        },
        {
            "id": 2513,
            "rarity": 91,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2538,
            "rarity": 91,
            "type": "treeFrog(4)"
        },
        {
            "id": 2582,
            "rarity": 91,
            "type": "treeFrog(5)"
        },
        {
            "id": 2639,
            "rarity": 91,
            "type": "treeFrog(1)"
        },
        {
            "id": 2655,
            "rarity": 91,
            "type": "treeFrog(3)"
        },
        {
            "id": 2714,
            "rarity": 91,
            "type": "treeFrog(4)"
        },
        {
            "id": 2748,
            "rarity": 91,
            "type": "grayTreeFrog"
        },
        {
            "id": 2811,
            "rarity": 91,
            "type": "treeFrog(8)"
        },
        {
            "id": 2852,
            "rarity": 91,
            "type": "treeFrog(1)"
        },
        {
            "id": 2913,
            "rarity": 91,
            "type": "blueTreeFrog"
        },
        {
            "id": 2981,
            "rarity": 91,
            "type": "treeFrog(4)"
        },
        {
            "id": 3009,
            "rarity": 91,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3032,
            "rarity": 91,
            "type": "treeFrog(5)"
        },
        {
            "id": 3043,
            "rarity": 91,
            "type": "treeFrog(4)"
        },
        {
            "id": 3074,
            "rarity": 91,
            "type": "treeFrog(5)"
        },
        {
            "id": 3148,
            "rarity": 91,
            "type": "treeFrog(5)"
        },
        {
            "id": 3219,
            "rarity": 91,
            "type": "stawberryDartFrog"
        },
        {
            "id": 3237,
            "rarity": 91,
            "type": "treeFrog(4)"
        },
        {
            "id": 3272,
            "rarity": 91,
            "type": "goldenDartFrog"
        },
        {
            "id": 3304,
            "rarity": 91,
            "type": "treeFrog(5)"
        },
        {
            "id": 3408,
            "rarity": 91,
            "type": "treeFrog(5)"
        },
        {
            "id": 3419,
            "rarity": 91,
            "type": "treeFrog(6)"
        },
        {
            "id": 3434,
            "rarity": 91,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3437,
            "rarity": 91,
            "type": "treeFrog(5)"
        },
        {
            "id": 3443,
            "rarity": 91,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3455,
            "rarity": 91,
            "type": "treeFrog(7)"
        },
        {
            "id": 3544,
            "rarity": 91,
            "type": "treeFrog(7)"
        },
        {
            "id": 3582,
            "rarity": 91,
            "type": "treeFrog(5)"
        },
        {
            "id": 3594,
            "rarity": 91,
            "type": "treeFrog(7)"
        },
        {
            "id": 3629,
            "rarity": 91,
            "type": "treeFrog(3)"
        },
        {
            "id": 3649,
            "rarity": 91,
            "type": "treeFrog(5)"
        },
        {
            "id": 3661,
            "rarity": 91,
            "type": "treeFrog(4)"
        },
        {
            "id": 3799,
            "rarity": 91,
            "type": "treeFrog(2)"
        },
        {
            "id": 3840,
            "rarity": 91,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3897,
            "rarity": 91,
            "type": "treeFrog(8)"
        },
        {
            "id": 3964,
            "rarity": 91,
            "type": "treeFrog(4)"
        },
        {
            "id": 4018,
            "rarity": 91,
            "type": "tomatoFrog"
        },
        {
            "id": 4024,
            "rarity": 91,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 99,
            "rarity": 90,
            "type": "pinkTreeFrog"
        },
        {
            "id": 108,
            "rarity": 90,
            "type": "treeFrog(3)"
        },
        {
            "id": 110,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 121,
            "rarity": 90,
            "type": "treeFrog(3)"
        },
        {
            "id": 154,
            "rarity": 90,
            "type": "orangeTreeFrog"
        },
        {
            "id": 190,
            "rarity": 90,
            "type": "treeFrog(7)"
        },
        {
            "id": 200,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 215,
            "rarity": 90,
            "type": "treeFrog(3)"
        },
        {
            "id": 238,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 288,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 365,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 402,
            "rarity": 90,
            "type": "treeFrog(1)"
        },
        {
            "id": 404,
            "rarity": 90,
            "type": "pinkTreeFrog"
        },
        {
            "id": 422,
            "rarity": 90,
            "type": "pinkTreeFrog"
        },
        {
            "id": 500,
            "rarity": 90,
            "type": "blueDartFrog"
        },
        {
            "id": 527,
            "rarity": 90,
            "type": "blueTreeFrog"
        },
        {
            "id": 560,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 646,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 707,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 828,
            "rarity": 90,
            "type": "brownTreeFrog"
        },
        {
            "id": 843,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 905,
            "rarity": 90,
            "type": "cyanTreeFrog"
        },
        {
            "id": 913,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 925,
            "rarity": 90,
            "type": "treeFrog(7)"
        },
        {
            "id": 946,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 1059,
            "rarity": 90,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1084,
            "rarity": 90,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1175,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 1216,
            "rarity": 90,
            "type": "treeFrog(7)"
        },
        {
            "id": 1243,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 1322,
            "rarity": 90,
            "type": "treeFrog(3)"
        },
        {
            "id": 1405,
            "rarity": 90,
            "type": "treeFrog(3)"
        },
        {
            "id": 1415,
            "rarity": 90,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1434,
            "rarity": 90,
            "type": "treeFrog(3)"
        },
        {
            "id": 1436,
            "rarity": 90,
            "type": "treeFrog(6)"
        },
        {
            "id": 1440,
            "rarity": 90,
            "type": "treeFrog(3)"
        },
        {
            "id": 1487,
            "rarity": 90,
            "type": "treeFrog(2)"
        },
        {
            "id": 1496,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 1510,
            "rarity": 90,
            "type": "blueTreeFrog"
        },
        {
            "id": 1515,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 1535,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 1664,
            "rarity": 90,
            "type": "treeFrog(7)"
        },
        {
            "id": 1697,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 1722,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 1733,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 1815,
            "rarity": 90,
            "type": "treeFrog(3)"
        },
        {
            "id": 1890,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 1906,
            "rarity": 90,
            "type": "treeFrog(2)"
        },
        {
            "id": 1921,
            "rarity": 90,
            "type": "treeFrog(7)"
        },
        {
            "id": 1992,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 2023,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 2028,
            "rarity": 90,
            "type": "treeFrog(8)"
        },
        {
            "id": 2043,
            "rarity": 90,
            "type": "treeFrog(6)"
        },
        {
            "id": 2075,
            "rarity": 90,
            "type": "treeFrog(6)"
        },
        {
            "id": 2102,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 2216,
            "rarity": 90,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2370,
            "rarity": 90,
            "type": "treeFrog(8)"
        },
        {
            "id": 2390,
            "rarity": 90,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2393,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 2430,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 2459,
            "rarity": 90,
            "type": "goldenDartFrog"
        },
        {
            "id": 2535,
            "rarity": 90,
            "type": "tomatoFrog"
        },
        {
            "id": 2542,
            "rarity": 90,
            "type": "treeFrog(6)"
        },
        {
            "id": 2593,
            "rarity": 90,
            "type": "brownTreeFrog"
        },
        {
            "id": 2603,
            "rarity": 90,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2609,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 2660,
            "rarity": 90,
            "type": "treeFrog(3)"
        },
        {
            "id": 2674,
            "rarity": 90,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2827,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 2831,
            "rarity": 90,
            "type": "treeFrog(6)"
        },
        {
            "id": 2839,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 2845,
            "rarity": 90,
            "type": "goldenDartFrog"
        },
        {
            "id": 2854,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 2869,
            "rarity": 90,
            "type": "treeFrog(6)"
        },
        {
            "id": 2894,
            "rarity": 90,
            "type": "treeFrog(7)"
        },
        {
            "id": 3053,
            "rarity": 90,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3075,
            "rarity": 90,
            "type": "tomatoFrog"
        },
        {
            "id": 3139,
            "rarity": 90,
            "type": "treeFrog(6)"
        },
        {
            "id": 3165,
            "rarity": 90,
            "type": "treeFrog(3)"
        },
        {
            "id": 3191,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 3245,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 3275,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 3276,
            "rarity": 90,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3291,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 3311,
            "rarity": 90,
            "type": "treeFrog(2)"
        },
        {
            "id": 3344,
            "rarity": 90,
            "type": "unknown"
        },
        {
            "id": 3427,
            "rarity": 90,
            "type": "brownTreeFrog"
        },
        {
            "id": 3433,
            "rarity": 90,
            "type": "tomatoFrog"
        },
        {
            "id": 3520,
            "rarity": 90,
            "type": "treeFrog(7)"
        },
        {
            "id": 3562,
            "rarity": 90,
            "type": "treeFrog(5)"
        },
        {
            "id": 3619,
            "rarity": 90,
            "type": "treeFrog(6)"
        },
        {
            "id": 3643,
            "rarity": 90,
            "type": "treeFrog(6)"
        },
        {
            "id": 3698,
            "rarity": 90,
            "type": "treeFrog(6)"
        },
        {
            "id": 3718,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 3784,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 3824,
            "rarity": 90,
            "type": "treeFrog(4)"
        },
        {
            "id": 3841,
            "rarity": 90,
            "type": "blueTreeFrog"
        },
        {
            "id": 3862,
            "rarity": 90,
            "type": "treeFrog(2)"
        },
        {
            "id": 195,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 225,
            "rarity": 89,
            "type": "treeFrog(7)"
        },
        {
            "id": 272,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 275,
            "rarity": 89,
            "type": "treeFrog(7)"
        },
        {
            "id": 281,
            "rarity": 89,
            "type": "treeFrog(3)"
        },
        {
            "id": 392,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 423,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 508,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 577,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 596,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 674,
            "rarity": 89,
            "type": "grayTreeFrog"
        },
        {
            "id": 726,
            "rarity": 89,
            "type": "goldenDartFrog"
        },
        {
            "id": 735,
            "rarity": 89,
            "type": "treeFrog(6)"
        },
        {
            "id": 745,
            "rarity": 89,
            "type": "orangeTreeFrog"
        },
        {
            "id": 746,
            "rarity": 89,
            "type": "treeFrog(7)"
        },
        {
            "id": 791,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 838,
            "rarity": 89,
            "type": "cyanTreeFrog"
        },
        {
            "id": 849,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 864,
            "rarity": 89,
            "type": "blueDartFrog"
        },
        {
            "id": 939,
            "rarity": 89,
            "type": "treeFrog(3)"
        },
        {
            "id": 940,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 978,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 1007,
            "rarity": 89,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1010,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 1047,
            "rarity": 89,
            "type": "treeFrog(8)"
        },
        {
            "id": 1053,
            "rarity": 89,
            "type": "brownTreeFrog"
        },
        {
            "id": 1076,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 1103,
            "rarity": 89,
            "type": "treeFrog(6)"
        },
        {
            "id": 1141,
            "rarity": 89,
            "type": "treeFrog(6)"
        },
        {
            "id": 1299,
            "rarity": 89,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1303,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 1441,
            "rarity": 89,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1507,
            "rarity": 89,
            "type": "treeFrog(8)"
        },
        {
            "id": 1528,
            "rarity": 89,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1543,
            "rarity": 89,
            "type": "treeFrog(8)"
        },
        {
            "id": 1549,
            "rarity": 89,
            "type": "treeFrog(6)"
        },
        {
            "id": 1572,
            "rarity": 89,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1601,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 1615,
            "rarity": 89,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1656,
            "rarity": 89,
            "type": "tomatoFrog"
        },
        {
            "id": 1657,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 1667,
            "rarity": 89,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1729,
            "rarity": 89,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1735,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 1847,
            "rarity": 89,
            "type": "treeFrog(8)"
        },
        {
            "id": 1883,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 1888,
            "rarity": 89,
            "type": "goldenDartFrog"
        },
        {
            "id": 1903,
            "rarity": 89,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1920,
            "rarity": 89,
            "type": "brownTreeFrog"
        },
        {
            "id": 1947,
            "rarity": 89,
            "type": "greenTreeFrog"
        },
        {
            "id": 1971,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 2001,
            "rarity": 89,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2145,
            "rarity": 89,
            "type": "blueDartFrog"
        },
        {
            "id": 2154,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 2171,
            "rarity": 89,
            "type": "treeFrog(7)"
        },
        {
            "id": 2193,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 2200,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 2203,
            "rarity": 89,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2305,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 2319,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 2362,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 2380,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 2422,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 2441,
            "rarity": 89,
            "type": "treeFrog(6)"
        },
        {
            "id": 2511,
            "rarity": 89,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2544,
            "rarity": 89,
            "type": "treeFrog(7)"
        },
        {
            "id": 2559,
            "rarity": 89,
            "type": "blueDartFrog"
        },
        {
            "id": 2578,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 2616,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 2680,
            "rarity": 89,
            "type": "tomatoFrog"
        },
        {
            "id": 2690,
            "rarity": 89,
            "type": "treeFrog(3)"
        },
        {
            "id": 2708,
            "rarity": 89,
            "type": "treeFrog(6)"
        },
        {
            "id": 2734,
            "rarity": 89,
            "type": "treeFrog(8)"
        },
        {
            "id": 2757,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 2765,
            "rarity": 89,
            "type": "tomatoFrog"
        },
        {
            "id": 2822,
            "rarity": 89,
            "type": "goldenDartFrog"
        },
        {
            "id": 2826,
            "rarity": 89,
            "type": "treeFrog(3)"
        },
        {
            "id": 2880,
            "rarity": 89,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2975,
            "rarity": 89,
            "type": "tomatoFrog"
        },
        {
            "id": 2999,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 3021,
            "rarity": 89,
            "type": "tomatoFrog"
        },
        {
            "id": 3037,
            "rarity": 89,
            "type": "treeFrog(7)"
        },
        {
            "id": 3039,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 3120,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 3214,
            "rarity": 89,
            "type": "treeFrog(7)"
        },
        {
            "id": 3224,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 3292,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 3326,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 3335,
            "rarity": 89,
            "type": "goldenDartFrog"
        },
        {
            "id": 3431,
            "rarity": 89,
            "type": "treeFrog(8)"
        },
        {
            "id": 3480,
            "rarity": 89,
            "type": "treeFrog(6)"
        },
        {
            "id": 3481,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 3489,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 3524,
            "rarity": 89,
            "type": "treeFrog(7)"
        },
        {
            "id": 3680,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 3689,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 3802,
            "rarity": 89,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3826,
            "rarity": 89,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3846,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 3890,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 3898,
            "rarity": 89,
            "type": "treeFrog(4)"
        },
        {
            "id": 3927,
            "rarity": 89,
            "type": "blueDartFrog"
        },
        {
            "id": 3933,
            "rarity": 89,
            "type": "treeFrog(5)"
        },
        {
            "id": 3970,
            "rarity": 89,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3972,
            "rarity": 89,
            "type": "treeFrog(7)"
        },
        {
            "id": 8,
            "rarity": 88,
            "type": "treeFrog(8)"
        },
        {
            "id": 10,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 103,
            "rarity": 88,
            "type": "goldenDartFrog"
        },
        {
            "id": 125,
            "rarity": 88,
            "type": "treeFrog(6)"
        },
        {
            "id": 149,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 173,
            "rarity": 88,
            "type": "treeFrog(3)"
        },
        {
            "id": 201,
            "rarity": 88,
            "type": "treeFrog(8)"
        },
        {
            "id": 218,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 245,
            "rarity": 88,
            "type": "treeFrog(7)"
        },
        {
            "id": 248,
            "rarity": 88,
            "type": "pinkTreeFrog"
        },
        {
            "id": 290,
            "rarity": 88,
            "type": "treeFrog(7)"
        },
        {
            "id": 428,
            "rarity": 88,
            "type": "treeFrog(4)"
        },
        {
            "id": 452,
            "rarity": 88,
            "type": "unknown"
        },
        {
            "id": 506,
            "rarity": 88,
            "type": "stawberryDartFrog"
        },
        {
            "id": 637,
            "rarity": 88,
            "type": "unknown"
        },
        {
            "id": 650,
            "rarity": 88,
            "type": "treeFrog(4)"
        },
        {
            "id": 670,
            "rarity": 88,
            "type": "unknown"
        },
        {
            "id": 684,
            "rarity": 88,
            "type": "treeFrog(8)"
        },
        {
            "id": 689,
            "rarity": 88,
            "type": "treeFrog(6)"
        },
        {
            "id": 742,
            "rarity": 88,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 795,
            "rarity": 88,
            "type": "treeFrog(4)"
        },
        {
            "id": 875,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 926,
            "rarity": 88,
            "type": "treeFrog(1)"
        },
        {
            "id": 931,
            "rarity": 88,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1140,
            "rarity": 88,
            "type": "treeFrog(7)"
        },
        {
            "id": 1153,
            "rarity": 88,
            "type": "treeFrog(6)"
        },
        {
            "id": 1154,
            "rarity": 88,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1193,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 1269,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 1352,
            "rarity": 88,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1376,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 1378,
            "rarity": 88,
            "type": "blueDartFrog"
        },
        {
            "id": 1379,
            "rarity": 88,
            "type": "treeFrog(3)"
        },
        {
            "id": 1552,
            "rarity": 88,
            "type": "tomatoFrog"
        },
        {
            "id": 1633,
            "rarity": 88,
            "type": "treeFrog(4)"
        },
        {
            "id": 1651,
            "rarity": 88,
            "type": "treeFrog(6)"
        },
        {
            "id": 1678,
            "rarity": 88,
            "type": "treeFrog(7)"
        },
        {
            "id": 1705,
            "rarity": 88,
            "type": "treeFrog(8)"
        },
        {
            "id": 1765,
            "rarity": 88,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1768,
            "rarity": 88,
            "type": "treeFrog(6)"
        },
        {
            "id": 1790,
            "rarity": 88,
            "type": "treeFrog(1)"
        },
        {
            "id": 1793,
            "rarity": 88,
            "type": "treeFrog(3)"
        },
        {
            "id": 1851,
            "rarity": 88,
            "type": "tomatoFrog"
        },
        {
            "id": 1862,
            "rarity": 88,
            "type": "treeFrog(4)"
        },
        {
            "id": 1876,
            "rarity": 88,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1881,
            "rarity": 88,
            "type": "closedEyes"
        },
        {
            "id": 1959,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 1960,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 2076,
            "rarity": 88,
            "type": "brownTreeFrog"
        },
        {
            "id": 2136,
            "rarity": 88,
            "type": "treeFrog(6)"
        },
        {
            "id": 2163,
            "rarity": 88,
            "type": "treeFrog(6)"
        },
        {
            "id": 2186,
            "rarity": 88,
            "type": "treeFrog(7)"
        },
        {
            "id": 2272,
            "rarity": 88,
            "type": "treeFrog(3)"
        },
        {
            "id": 2330,
            "rarity": 88,
            "type": "blueDartFrog"
        },
        {
            "id": 2356,
            "rarity": 88,
            "type": "blueTreeFrog"
        },
        {
            "id": 2361,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 2445,
            "rarity": 88,
            "type": "treeFrog(1)"
        },
        {
            "id": 2573,
            "rarity": 88,
            "type": "treeFrog(3)"
        },
        {
            "id": 2612,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 2719,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 2738,
            "rarity": 88,
            "type": "treeFrog(6)"
        },
        {
            "id": 2762,
            "rarity": 88,
            "type": "treeFrog(4)"
        },
        {
            "id": 2830,
            "rarity": 88,
            "type": "treeFrog(8)"
        },
        {
            "id": 2837,
            "rarity": 88,
            "type": "treeFrog(4)"
        },
        {
            "id": 2864,
            "rarity": 88,
            "type": "brownTreeFrog"
        },
        {
            "id": 2882,
            "rarity": 88,
            "type": "treeFrog(6)"
        },
        {
            "id": 2988,
            "rarity": 88,
            "type": "brownTreeFrog"
        },
        {
            "id": 3082,
            "rarity": 88,
            "type": "treeFrog(6)"
        },
        {
            "id": 3205,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 3225,
            "rarity": 88,
            "type": "treeFrog(6)"
        },
        {
            "id": 3248,
            "rarity": 88,
            "type": "treeFrog(8)"
        },
        {
            "id": 3338,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 3341,
            "rarity": 88,
            "type": "tomatoFrog"
        },
        {
            "id": 3366,
            "rarity": 88,
            "type": "treeFrog(6)"
        },
        {
            "id": 3441,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 3471,
            "rarity": 88,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3479,
            "rarity": 88,
            "type": "treeFrog(7)"
        },
        {
            "id": 3508,
            "rarity": 88,
            "type": "treeFrog(7)"
        },
        {
            "id": 3513,
            "rarity": 88,
            "type": "treeFrog(6)"
        },
        {
            "id": 3549,
            "rarity": 88,
            "type": "goldenDartFrog"
        },
        {
            "id": 3611,
            "rarity": 88,
            "type": "treeFrog(4)"
        },
        {
            "id": 3621,
            "rarity": 88,
            "type": "treeFrog(7)"
        },
        {
            "id": 3675,
            "rarity": 88,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3795,
            "rarity": 88,
            "type": "treeFrog(8)"
        },
        {
            "id": 3812,
            "rarity": 88,
            "type": "treeFrog(6)"
        },
        {
            "id": 3821,
            "rarity": 88,
            "type": "grayTreeFrog"
        },
        {
            "id": 3830,
            "rarity": 88,
            "type": "treeFrog(7)"
        },
        {
            "id": 3834,
            "rarity": 88,
            "type": "treeFrog(6)"
        },
        {
            "id": 3874,
            "rarity": 88,
            "type": "grayTreeFrog"
        },
        {
            "id": 3909,
            "rarity": 88,
            "type": "treeFrog(8)"
        },
        {
            "id": 3985,
            "rarity": 88,
            "type": "unknown"
        },
        {
            "id": 4001,
            "rarity": 88,
            "type": "treeFrog(7)"
        },
        {
            "id": 4003,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 4019,
            "rarity": 88,
            "type": "treeFrog(5)"
        },
        {
            "id": 39,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 65,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 151,
            "rarity": 87,
            "type": "tomatoFrog"
        },
        {
            "id": 155,
            "rarity": 87,
            "type": "treeFrog(4)"
        },
        {
            "id": 212,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 222,
            "rarity": 87,
            "type": "treeFrog(8)"
        },
        {
            "id": 236,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 242,
            "rarity": 87,
            "type": "unknown"
        },
        {
            "id": 244,
            "rarity": 87,
            "type": "treeFrog(8)"
        },
        {
            "id": 327,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 394,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 441,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 464,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 479,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 538,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 610,
            "rarity": 87,
            "type": "unknown"
        },
        {
            "id": 621,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 647,
            "rarity": 87,
            "type": "pinkTreeFrog"
        },
        {
            "id": 667,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 672,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 709,
            "rarity": 87,
            "type": "tomatoFrog"
        },
        {
            "id": 728,
            "rarity": 87,
            "type": "orangeTreeFrog"
        },
        {
            "id": 750,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 765,
            "rarity": 87,
            "type": "treeFrog(4)"
        },
        {
            "id": 891,
            "rarity": 87,
            "type": "stawberryDartFrog"
        },
        {
            "id": 970,
            "rarity": 87,
            "type": "treeFrog(8)"
        },
        {
            "id": 1108,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 1128,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 1143,
            "rarity": 87,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1173,
            "rarity": 87,
            "type": "treeFrog(4)"
        },
        {
            "id": 1183,
            "rarity": 87,
            "type": "brownTreeFrog"
        },
        {
            "id": 1319,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 1342,
            "rarity": 87,
            "type": "treeFrog(8)"
        },
        {
            "id": 1541,
            "rarity": 87,
            "type": "treeFrog(8)"
        },
        {
            "id": 1556,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 1584,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 1604,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 1622,
            "rarity": 87,
            "type": "treeFrog(3)"
        },
        {
            "id": 1632,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 1652,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 1671,
            "rarity": 87,
            "type": "treeFrog(8)"
        },
        {
            "id": 1681,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 1740,
            "rarity": 87,
            "type": "treeFrog(8)"
        },
        {
            "id": 1752,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 1753,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 1794,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 1860,
            "rarity": 87,
            "type": "tomatoFrog"
        },
        {
            "id": 1877,
            "rarity": 87,
            "type": "grayTreeFrog"
        },
        {
            "id": 1885,
            "rarity": 87,
            "type": "blueDartFrog"
        },
        {
            "id": 1914,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 1923,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 1945,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 1990,
            "rarity": 87,
            "type": "tomatoFrog"
        },
        {
            "id": 1994,
            "rarity": 87,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2195,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 2198,
            "rarity": 87,
            "type": "treeFrog(3)"
        },
        {
            "id": 2225,
            "rarity": 87,
            "type": "treeFrog(8)"
        },
        {
            "id": 2265,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 2335,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 2355,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 2375,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 2396,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 2400,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 2451,
            "rarity": 87,
            "type": "blueTreeFrog"
        },
        {
            "id": 2480,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 2487,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 2529,
            "rarity": 87,
            "type": "treeFrog(8)"
        },
        {
            "id": 2547,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 2597,
            "rarity": 87,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2610,
            "rarity": 87,
            "type": "tomatoFrog"
        },
        {
            "id": 2622,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 2637,
            "rarity": 87,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2676,
            "rarity": 87,
            "type": "treeFrog(4)"
        },
        {
            "id": 2697,
            "rarity": 87,
            "type": "blueTreeFrog"
        },
        {
            "id": 2786,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 2803,
            "rarity": 87,
            "type": "unknown"
        },
        {
            "id": 2810,
            "rarity": 87,
            "type": "treeFrog(4)"
        },
        {
            "id": 2959,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 3019,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 3098,
            "rarity": 87,
            "type": "treeFrog(8)"
        },
        {
            "id": 3183,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 3186,
            "rarity": 87,
            "type": "blueDartFrog"
        },
        {
            "id": 3220,
            "rarity": 87,
            "type": "goldenDartFrog"
        },
        {
            "id": 3263,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 3269,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 3302,
            "rarity": 87,
            "type": "grayTreeFrog"
        },
        {
            "id": 3308,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 3334,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 3345,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 3378,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 3383,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 3407,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 3415,
            "rarity": 87,
            "type": "treeFrog(4)"
        },
        {
            "id": 3461,
            "rarity": 87,
            "type": "grayTreeFrog"
        },
        {
            "id": 3462,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 3511,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 3532,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 3538,
            "rarity": 87,
            "type": "grayTreeFrog"
        },
        {
            "id": 3543,
            "rarity": 87,
            "type": "treeFrog(3)"
        },
        {
            "id": 3577,
            "rarity": 87,
            "type": "grayTreeFrog"
        },
        {
            "id": 3634,
            "rarity": 87,
            "type": "treeFrog(7)"
        },
        {
            "id": 3731,
            "rarity": 87,
            "type": "treeFrog(3)"
        },
        {
            "id": 3764,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 3766,
            "rarity": 87,
            "type": "unknown"
        },
        {
            "id": 3767,
            "rarity": 87,
            "type": "unknown"
        },
        {
            "id": 3888,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 3936,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 3974,
            "rarity": 87,
            "type": "treeFrog(6)"
        },
        {
            "id": 3983,
            "rarity": 87,
            "type": "grayTreeFrog"
        },
        {
            "id": 4010,
            "rarity": 87,
            "type": "treeFrog(5)"
        },
        {
            "id": 4035,
            "rarity": 87,
            "type": "treeFrog(8)"
        },
        {
            "id": 45,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 49,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 82,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 86,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 161,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 164,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 182,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 189,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 217,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 231,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 249,
            "rarity": 86,
            "type": "treeFrog(5)"
        },
        {
            "id": 261,
            "rarity": 86,
            "type": "treeFrog(5)"
        },
        {
            "id": 311,
            "rarity": 86,
            "type": "goldenDartFrog"
        },
        {
            "id": 319,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 411,
            "rarity": 86,
            "type": "treeFrog(5)"
        },
        {
            "id": 456,
            "rarity": 86,
            "type": "blueTreeFrog"
        },
        {
            "id": 481,
            "rarity": 86,
            "type": "unknown"
        },
        {
            "id": 490,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 552,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 635,
            "rarity": 86,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 649,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 652,
            "rarity": 86,
            "type": "cyanTreeFrog"
        },
        {
            "id": 721,
            "rarity": 86,
            "type": "treeFrog(4)"
        },
        {
            "id": 841,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 845,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 907,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 951,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 952,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 966,
            "rarity": 86,
            "type": "treeFrog(5)"
        },
        {
            "id": 987,
            "rarity": 86,
            "type": "treeFrog(5)"
        },
        {
            "id": 1009,
            "rarity": 86,
            "type": "blueDartFrog"
        },
        {
            "id": 1044,
            "rarity": 86,
            "type": "greenTreeFrog"
        },
        {
            "id": 1086,
            "rarity": 86,
            "type": "treeFrog(5)"
        },
        {
            "id": 1148,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 1159,
            "rarity": 86,
            "type": "grayTreeFrog"
        },
        {
            "id": 1333,
            "rarity": 86,
            "type": "unknown"
        },
        {
            "id": 1351,
            "rarity": 86,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1489,
            "rarity": 86,
            "type": "greenTreeFrog"
        },
        {
            "id": 1553,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 1554,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 1566,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 1595,
            "rarity": 86,
            "type": "treeFrog(4)"
        },
        {
            "id": 1642,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 1644,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 1646,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 1666,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 1676,
            "rarity": 86,
            "type": "treeFrog(5)"
        },
        {
            "id": 1767,
            "rarity": 86,
            "type": "greenTreeFrog"
        },
        {
            "id": 1801,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 1814,
            "rarity": 86,
            "type": "treeFrog(5)"
        },
        {
            "id": 1855,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 1865,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 1933,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 1956,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 1973,
            "rarity": 86,
            "type": "treeFrog(5)"
        },
        {
            "id": 1996,
            "rarity": 86,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2011,
            "rarity": 86,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2017,
            "rarity": 86,
            "type": "grayTreeFrog"
        },
        {
            "id": 2053,
            "rarity": 86,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2063,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 2106,
            "rarity": 86,
            "type": "greenTreeFrog"
        },
        {
            "id": 2119,
            "rarity": 86,
            "type": "treeFrog(5)"
        },
        {
            "id": 2130,
            "rarity": 86,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2185,
            "rarity": 86,
            "type": "treeFrog(4)"
        },
        {
            "id": 2191,
            "rarity": 86,
            "type": "treeFrog(3)"
        },
        {
            "id": 2196,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 2214,
            "rarity": 86,
            "type": "unknown"
        },
        {
            "id": 2236,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 2275,
            "rarity": 86,
            "type": "goldenDartFrog"
        },
        {
            "id": 2316,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 2337,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 2385,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 2405,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 2463,
            "rarity": 86,
            "type": "goldenDartFrog"
        },
        {
            "id": 2475,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 2482,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 2528,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 2589,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 2663,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 2665,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 2728,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 2730,
            "rarity": 86,
            "type": "treeFrog(3)"
        },
        {
            "id": 2772,
            "rarity": 86,
            "type": "blueTreeFrog"
        },
        {
            "id": 2773,
            "rarity": 86,
            "type": "treeFrog(5)"
        },
        {
            "id": 2849,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 3011,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 3012,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 3060,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 3121,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 3140,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 3142,
            "rarity": 86,
            "type": "treeFrog(5)"
        },
        {
            "id": 3160,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 3166,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 3197,
            "rarity": 86,
            "type": "treeFrog(3)"
        },
        {
            "id": 3227,
            "rarity": 86,
            "type": "goldenDartFrog"
        },
        {
            "id": 3281,
            "rarity": 86,
            "type": "brownTreeFrog"
        },
        {
            "id": 3370,
            "rarity": 86,
            "type": "treeFrog(8)"
        },
        {
            "id": 3375,
            "rarity": 86,
            "type": "treeFrog(4)"
        },
        {
            "id": 3379,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 3435,
            "rarity": 86,
            "type": "blueTreeFrog"
        },
        {
            "id": 3457,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 3512,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 3527,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 3551,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 3638,
            "rarity": 86,
            "type": "blueTreeFrog"
        },
        {
            "id": 3659,
            "rarity": 86,
            "type": "treeFrog(4)"
        },
        {
            "id": 3737,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 3746,
            "rarity": 86,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3755,
            "rarity": 86,
            "type": "treeFrog(7)"
        },
        {
            "id": 3844,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 3859,
            "rarity": 86,
            "type": "blueTreeFrog"
        },
        {
            "id": 3878,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 3880,
            "rarity": 86,
            "type": "treeFrog(4)"
        },
        {
            "id": 3893,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 4016,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 4020,
            "rarity": 86,
            "type": "treeFrog(6)"
        },
        {
            "id": 4023,
            "rarity": 86,
            "type": "treeFrog(5)"
        },
        {
            "id": 4027,
            "rarity": 86,
            "type": "treeFrog(5)"
        },
        {
            "id": 4030,
            "rarity": 86,
            "type": "grayTreeFrog"
        },
        {
            "id": 23,
            "rarity": 85,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 64,
            "rarity": 85,
            "type": "treeFrog(4)"
        },
        {
            "id": 107,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 120,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 131,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 191,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 251,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 276,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 314,
            "rarity": 85,
            "type": "cyanTreeFrog"
        },
        {
            "id": 316,
            "rarity": 85,
            "type": "greenTreeFrog"
        },
        {
            "id": 357,
            "rarity": 85,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 370,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 372,
            "rarity": 85,
            "type": "treeFrog(5)"
        },
        {
            "id": 400,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 416,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 427,
            "rarity": 85,
            "type": "treeFrog(5)"
        },
        {
            "id": 451,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 492,
            "rarity": 85,
            "type": "treeFrog(4)"
        },
        {
            "id": 496,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 503,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 524,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 528,
            "rarity": 85,
            "type": "cyanTreeFrog"
        },
        {
            "id": 561,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 567,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 589,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 616,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 673,
            "rarity": 85,
            "type": "brownTreeFrog"
        },
        {
            "id": 714,
            "rarity": 85,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 717,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 723,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 738,
            "rarity": 85,
            "type": "treeFrog(5)"
        },
        {
            "id": 751,
            "rarity": 85,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 753,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 761,
            "rarity": 85,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 817,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 837,
            "rarity": 85,
            "type": "treeFrog(5)"
        },
        {
            "id": 863,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 869,
            "rarity": 85,
            "type": "blueDartFrog"
        },
        {
            "id": 870,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 874,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 881,
            "rarity": 85,
            "type": "treeFrog(5)"
        },
        {
            "id": 924,
            "rarity": 85,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 928,
            "rarity": 85,
            "type": "treeFrog(4)"
        },
        {
            "id": 1020,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 1070,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 1137,
            "rarity": 85,
            "type": "tomatoFrog"
        },
        {
            "id": 1274,
            "rarity": 85,
            "type": "blueTreeFrog"
        },
        {
            "id": 1302,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 1334,
            "rarity": 85,
            "type": "treeFrog(4)"
        },
        {
            "id": 1367,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 1407,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 1422,
            "rarity": 85,
            "type": "croaking"
        },
        {
            "id": 1478,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 1500,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 1520,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 1712,
            "rarity": 85,
            "type": "goldenDartFrog"
        },
        {
            "id": 1738,
            "rarity": 85,
            "type": "goldenDartFrog"
        },
        {
            "id": 1745,
            "rarity": 85,
            "type": "treeFrog(5)"
        },
        {
            "id": 1769,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 1813,
            "rarity": 85,
            "type": "treeFrog(4)"
        },
        {
            "id": 1850,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 1909,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 1941,
            "rarity": 85,
            "type": "brownTreeFrog"
        },
        {
            "id": 2109,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 2129,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 2174,
            "rarity": 85,
            "type": "unknown"
        },
        {
            "id": 2210,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 2280,
            "rarity": 85,
            "type": "goldenDartFrog"
        },
        {
            "id": 2284,
            "rarity": 85,
            "type": "tomatoFrog"
        },
        {
            "id": 2343,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 2594,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 2649,
            "rarity": 85,
            "type": "treeFrog(5)"
        },
        {
            "id": 2682,
            "rarity": 85,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2863,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 2888,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 2906,
            "rarity": 85,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2927,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 2953,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 2954,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 3018,
            "rarity": 85,
            "type": "treeFrog(4)"
        },
        {
            "id": 3055,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 3128,
            "rarity": 85,
            "type": "treeFrog(5)"
        },
        {
            "id": 3161,
            "rarity": 85,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3167,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 3182,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 3289,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 3298,
            "rarity": 85,
            "type": "treeFrog(5)"
        },
        {
            "id": 3317,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 3323,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 3331,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 3337,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 3390,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 3449,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 3494,
            "rarity": 85,
            "type": "treeFrog(5)"
        },
        {
            "id": 3518,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 3531,
            "rarity": 85,
            "type": "blueTreeFrog"
        },
        {
            "id": 3542,
            "rarity": 85,
            "type": "blueTreeFrog"
        },
        {
            "id": 3602,
            "rarity": 85,
            "type": "greenTreeFrog"
        },
        {
            "id": 3657,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 3695,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 3724,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 3774,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 3787,
            "rarity": 85,
            "type": "greenTreeFrog"
        },
        {
            "id": 3798,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 3811,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 3813,
            "rarity": 85,
            "type": "treeFrog(6)"
        },
        {
            "id": 3877,
            "rarity": 85,
            "type": "treeFrog(8)"
        },
        {
            "id": 4005,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 4008,
            "rarity": 85,
            "type": "treeFrog(7)"
        },
        {
            "id": 4037,
            "rarity": 85,
            "type": "treeFrog(5)"
        },
        {
            "id": 44,
            "rarity": 84,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 113,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 165,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 167,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 188,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 377,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 378,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 385,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 410,
            "rarity": 84,
            "type": "brownTreeFrog"
        },
        {
            "id": 426,
            "rarity": 84,
            "type": "treeFrog(4)"
        },
        {
            "id": 457,
            "rarity": 84,
            "type": "treeFrog(5)"
        },
        {
            "id": 507,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 525,
            "rarity": 84,
            "type": "unknown"
        },
        {
            "id": 530,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 580,
            "rarity": 84,
            "type": "cyanTreeFrog"
        },
        {
            "id": 627,
            "rarity": 84,
            "type": "treeFrog(4)"
        },
        {
            "id": 640,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 715,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 775,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 799,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 847,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 872,
            "rarity": 84,
            "type": "treeFrog(4)"
        },
        {
            "id": 892,
            "rarity": 84,
            "type": "treeFrog(5)"
        },
        {
            "id": 895,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 982,
            "rarity": 84,
            "type": "treeFrog(5)"
        },
        {
            "id": 1019,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 1028,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 1035,
            "rarity": 84,
            "type": "blueTreeFrog"
        },
        {
            "id": 1046,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 1314,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 1323,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 1354,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 1472,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 1491,
            "rarity": 84,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1574,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 1600,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 1654,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 1732,
            "rarity": 84,
            "type": "treeFrog(4)"
        },
        {
            "id": 1759,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 1905,
            "rarity": 84,
            "type": "goldenDartFrog"
        },
        {
            "id": 1936,
            "rarity": 84,
            "type": "treeFrog(5)"
        },
        {
            "id": 1938,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 2034,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 2042,
            "rarity": 84,
            "type": "blueTreeFrog"
        },
        {
            "id": 2052,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 2059,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 2104,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 2142,
            "rarity": 84,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2157,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 2183,
            "rarity": 84,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2237,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 2245,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 2271,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 2289,
            "rarity": 84,
            "type": "blueTreeFrog"
        },
        {
            "id": 2313,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 2321,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 2327,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 2351,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 2428,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 2466,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 2472,
            "rarity": 84,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2491,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 2595,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 2596,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 2630,
            "rarity": 84,
            "type": "treeFrog(4)"
        },
        {
            "id": 2648,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 2659,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 2677,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 2698,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 2896,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 2902,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 3020,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 3029,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 3048,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 3066,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 3067,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 3069,
            "rarity": 84,
            "type": "unknown"
        },
        {
            "id": 3086,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 3150,
            "rarity": 84,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3155,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 3158,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 3176,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 3252,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 3299,
            "rarity": 84,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3313,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 3381,
            "rarity": 84,
            "type": "stawberryDartFrog"
        },
        {
            "id": 3399,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 3430,
            "rarity": 84,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3463,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 3464,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 3529,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 3530,
            "rarity": 84,
            "type": "treeFrog(4)"
        },
        {
            "id": 3553,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 3569,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 3586,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 3616,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 3630,
            "rarity": 84,
            "type": "blueDartFrog"
        },
        {
            "id": 3631,
            "rarity": 84,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3651,
            "rarity": 84,
            "type": "blueTreeFrog"
        },
        {
            "id": 3742,
            "rarity": 84,
            "type": "treeFrog(5)"
        },
        {
            "id": 3761,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 3816,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 3854,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 3943,
            "rarity": 84,
            "type": "pinkTreeFrog"
        },
        {
            "id": 4022,
            "rarity": 84,
            "type": "treeFrog(7)"
        },
        {
            "id": 4038,
            "rarity": 84,
            "type": "treeFrog(6)"
        },
        {
            "id": 4040,
            "rarity": 84,
            "type": "treeFrog(8)"
        },
        {
            "id": 30,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 35,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 77,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 89,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 169,
            "rarity": 83,
            "type": "treeFrog(5)"
        },
        {
            "id": 180,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 192,
            "rarity": 83,
            "type": "treeFrog(4)"
        },
        {
            "id": 228,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 274,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 386,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 389,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 391,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 467,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 468,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 535,
            "rarity": 83,
            "type": "blueDartFrog"
        },
        {
            "id": 557,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 565,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 585,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 620,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 705,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 729,
            "rarity": 83,
            "type": "brownTreeFrog"
        },
        {
            "id": 733,
            "rarity": 83,
            "type": "greenTreeFrog"
        },
        {
            "id": 853,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 930,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 1122,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 1145,
            "rarity": 83,
            "type": "treeFrog(5)"
        },
        {
            "id": 1157,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 1229,
            "rarity": 83,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1294,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 1313,
            "rarity": 83,
            "type": "tomatoFrog"
        },
        {
            "id": 1321,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 1370,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 1377,
            "rarity": 83,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1428,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 1481,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 1499,
            "rarity": 83,
            "type": "treeFrog(5)"
        },
        {
            "id": 1517,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 1533,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 1568,
            "rarity": 83,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1630,
            "rarity": 83,
            "type": "treeFrog(5)"
        },
        {
            "id": 1665,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 1702,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 1704,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 1734,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 1770,
            "rarity": 83,
            "type": "brownTreeFrog"
        },
        {
            "id": 1832,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 1910,
            "rarity": 83,
            "type": "treeFrog(5)"
        },
        {
            "id": 1916,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 1932,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 1966,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 1989,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 2069,
            "rarity": 83,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2096,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 2105,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 2175,
            "rarity": 83,
            "type": "blueDartFrog"
        },
        {
            "id": 2181,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 2184,
            "rarity": 83,
            "type": "tomatoFrog"
        },
        {
            "id": 2188,
            "rarity": 83,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2202,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 2206,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 2222,
            "rarity": 83,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2268,
            "rarity": 83,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2295,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 2420,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 2496,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 2584,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 2600,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 2601,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 2699,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 2755,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 2792,
            "rarity": 83,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2805,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 2813,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 2939,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 2943,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 2996,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 3044,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 3062,
            "rarity": 83,
            "type": "blueDartFrog"
        },
        {
            "id": 3073,
            "rarity": 83,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3134,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 3170,
            "rarity": 83,
            "type": "grayTreeFrog"
        },
        {
            "id": 3266,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 3309,
            "rarity": 83,
            "type": "brownTreeFrog"
        },
        {
            "id": 3343,
            "rarity": 83,
            "type": "blueTreeFrog"
        },
        {
            "id": 3351,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 3361,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 3372,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 3373,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 3405,
            "rarity": 83,
            "type": "greenTreeFrog"
        },
        {
            "id": 3410,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 3486,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 3541,
            "rarity": 83,
            "type": "unknown"
        },
        {
            "id": 3555,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 3625,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 3636,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 3658,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 3674,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 3676,
            "rarity": 83,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3683,
            "rarity": 83,
            "type": "treeFrog(5)"
        },
        {
            "id": 3715,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 3716,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 3800,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 3833,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 3842,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 3855,
            "rarity": 83,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3887,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 3899,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 3906,
            "rarity": 83,
            "type": "treeFrog(4)"
        },
        {
            "id": 3977,
            "rarity": 83,
            "type": "treeFrog(8)"
        },
        {
            "id": 4012,
            "rarity": 83,
            "type": "treeFrog(7)"
        },
        {
            "id": 4014,
            "rarity": 83,
            "type": "treeFrog(6)"
        },
        {
            "id": 92,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 96,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 117,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 295,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 326,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 439,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 480,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 513,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 540,
            "rarity": 82,
            "type": "brownTreeFrog"
        },
        {
            "id": 566,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 569,
            "rarity": 82,
            "type": "brownTreeFrog"
        },
        {
            "id": 579,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 594,
            "rarity": 82,
            "type": "brownTreeFrog"
        },
        {
            "id": 625,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 636,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 712,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 776,
            "rarity": 82,
            "type": "treeFrog(5)"
        },
        {
            "id": 876,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 877,
            "rarity": 82,
            "type": "cyanTreeFrog"
        },
        {
            "id": 883,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 899,
            "rarity": 82,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 916,
            "rarity": 82,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 967,
            "rarity": 82,
            "type": "treeFrog(5)"
        },
        {
            "id": 973,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 1043,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 1073,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 1074,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 1080,
            "rarity": 82,
            "type": "blueDartFrog"
        },
        {
            "id": 1111,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 1119,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 1165,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 1191,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 1196,
            "rarity": 82,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1371,
            "rarity": 82,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1383,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 1386,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 1396,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 1426,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 1435,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 1437,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 1522,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 1525,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 1536,
            "rarity": 82,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1625,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 1711,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 1750,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 1804,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 1852,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 1899,
            "rarity": 82,
            "type": "grayTreeFrog"
        },
        {
            "id": 1907,
            "rarity": 82,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1908,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 1915,
            "rarity": 82,
            "type": "treeFrog(5)"
        },
        {
            "id": 1929,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 1951,
            "rarity": 82,
            "type": "brownTreeFrog"
        },
        {
            "id": 1984,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 2000,
            "rarity": 82,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2047,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 2114,
            "rarity": 82,
            "type": "treeFrog(5)"
        },
        {
            "id": 2220,
            "rarity": 82,
            "type": "brownTreeFrog"
        },
        {
            "id": 2248,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 2257,
            "rarity": 82,
            "type": "tomatoFrog"
        },
        {
            "id": 2286,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 2304,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 2308,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 2371,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 2485,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 2530,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 2566,
            "rarity": 82,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2629,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 2692,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 2702,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 2733,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 2764,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 2769,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 2776,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 2833,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 2856,
            "rarity": 82,
            "type": "grayTreeFrog"
        },
        {
            "id": 2963,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 2989,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 3010,
            "rarity": 82,
            "type": "blueTreeFrog"
        },
        {
            "id": 3057,
            "rarity": 82,
            "type": "greenTreeFrog"
        },
        {
            "id": 3058,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 3189,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 3283,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 3303,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 3306,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 3336,
            "rarity": 82,
            "type": "treeFrog(4)"
        },
        {
            "id": 3352,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 3406,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 3535,
            "rarity": 82,
            "type": "treeFrog(5)"
        },
        {
            "id": 3560,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 3575,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 3581,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 3597,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 3599,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 3641,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 3652,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 3670,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 3707,
            "rarity": 82,
            "type": "treeFrog(7)"
        },
        {
            "id": 3712,
            "rarity": 82,
            "type": "treeFrog(5)"
        },
        {
            "id": 3725,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 3745,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 3809,
            "rarity": 82,
            "type": "treeFrog(5)"
        },
        {
            "id": 3857,
            "rarity": 82,
            "type": "treeFrog(6)"
        },
        {
            "id": 4009,
            "rarity": 82,
            "type": "treeFrog(8)"
        },
        {
            "id": 36,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 208,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 246,
            "rarity": 81,
            "type": "brownTreeFrog"
        },
        {
            "id": 267,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 430,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 434,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 444,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 477,
            "rarity": 81,
            "type": "brownTreeFrog"
        },
        {
            "id": 478,
            "rarity": 81,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 485,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 523,
            "rarity": 81,
            "type": "treeFrog(6)"
        },
        {
            "id": 698,
            "rarity": 81,
            "type": "treeFrog(5)"
        },
        {
            "id": 703,
            "rarity": 81,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 731,
            "rarity": 81,
            "type": "grayTreeFrog"
        },
        {
            "id": 732,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 763,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 804,
            "rarity": 81,
            "type": "goldenDartFrog"
        },
        {
            "id": 807,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 915,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 1136,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 1222,
            "rarity": 81,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1247,
            "rarity": 81,
            "type": "unknown"
        },
        {
            "id": 1349,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 1375,
            "rarity": 81,
            "type": "brownTreeFrog"
        },
        {
            "id": 1444,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 1471,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 1650,
            "rarity": 81,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1653,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 1663,
            "rarity": 81,
            "type": "unknown"
        },
        {
            "id": 1811,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 2041,
            "rarity": 81,
            "type": "brownTreeFrog"
        },
        {
            "id": 2080,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 2107,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 2240,
            "rarity": 81,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2367,
            "rarity": 81,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2379,
            "rarity": 81,
            "type": "treeFrog(6)"
        },
        {
            "id": 2418,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 2423,
            "rarity": 81,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2498,
            "rarity": 81,
            "type": "treeFrog(6)"
        },
        {
            "id": 2539,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 2543,
            "rarity": 81,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2550,
            "rarity": 81,
            "type": "goldenDartFrog"
        },
        {
            "id": 2606,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 2645,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 2664,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 2720,
            "rarity": 81,
            "type": "brownTreeFrog"
        },
        {
            "id": 2742,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 2782,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 2877,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 3049,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 3089,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 3149,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 3211,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 3212,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 3385,
            "rarity": 81,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3429,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 3566,
            "rarity": 81,
            "type": "treeFrog(8)"
        },
        {
            "id": 3603,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 3700,
            "rarity": 81,
            "type": "treeFrog(6)"
        },
        {
            "id": 3754,
            "rarity": 81,
            "type": "treeFrog(7)"
        },
        {
            "id": 3879,
            "rarity": 81,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3929,
            "rarity": 81,
            "type": "treeFrog(6)"
        },
        {
            "id": 21,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 34,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 71,
            "rarity": 80,
            "type": "tomatoFrog"
        },
        {
            "id": 178,
            "rarity": 80,
            "type": "treeFrog(6)"
        },
        {
            "id": 181,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 193,
            "rarity": 80,
            "type": "treeFrog(6)"
        },
        {
            "id": 230,
            "rarity": 80,
            "type": "goldenTreeFrog"
        },
        {
            "id": 302,
            "rarity": 80,
            "type": "goldenTreeFrog"
        },
        {
            "id": 424,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 533,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 537,
            "rarity": 80,
            "type": "tomatoFrog"
        },
        {
            "id": 562,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 648,
            "rarity": 80,
            "type": "treeFrog(5)"
        },
        {
            "id": 769,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 790,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 821,
            "rarity": 80,
            "type": "unknown"
        },
        {
            "id": 858,
            "rarity": 80,
            "type": "grayTreeFrog"
        },
        {
            "id": 962,
            "rarity": 80,
            "type": "treeFrog(6)"
        },
        {
            "id": 1006,
            "rarity": 80,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1039,
            "rarity": 80,
            "type": "treeFrog(7)"
        },
        {
            "id": 1096,
            "rarity": 80,
            "type": "treeFrog(5)"
        },
        {
            "id": 1101,
            "rarity": 80,
            "type": "treeFrog(6)"
        },
        {
            "id": 1131,
            "rarity": 80,
            "type": "treeFrog(6)"
        },
        {
            "id": 1135,
            "rarity": 80,
            "type": "treeFrog(7)"
        },
        {
            "id": 1186,
            "rarity": 80,
            "type": "treeFrog(5)"
        },
        {
            "id": 1384,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 1455,
            "rarity": 80,
            "type": "grayTreeFrog"
        },
        {
            "id": 1621,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 1628,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 1841,
            "rarity": 80,
            "type": "treeFrog(7)"
        },
        {
            "id": 2031,
            "rarity": 80,
            "type": "treeFrog(7)"
        },
        {
            "id": 2190,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 2199,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 2242,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 2244,
            "rarity": 80,
            "type": "treeFrog(7)"
        },
        {
            "id": 2288,
            "rarity": 80,
            "type": "grayTreeFrog"
        },
        {
            "id": 2318,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 2534,
            "rarity": 80,
            "type": "treeFrog(7)"
        },
        {
            "id": 2551,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 2853,
            "rarity": 80,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2855,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 2937,
            "rarity": 80,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2940,
            "rarity": 80,
            "type": "treeFrog(6)"
        },
        {
            "id": 3034,
            "rarity": 80,
            "type": "goldenDartFrog"
        },
        {
            "id": 3088,
            "rarity": 80,
            "type": "treeFrog(6)"
        },
        {
            "id": 3187,
            "rarity": 80,
            "type": "treeFrog(5)"
        },
        {
            "id": 3195,
            "rarity": 80,
            "type": "treeFrog(8)"
        },
        {
            "id": 3432,
            "rarity": 80,
            "type": "tomatoFrog"
        },
        {
            "id": 3613,
            "rarity": 80,
            "type": "treeFrog(6)"
        },
        {
            "id": 3614,
            "rarity": 80,
            "type": "brownTreeFrog"
        },
        {
            "id": 3807,
            "rarity": 80,
            "type": "brownTreeFrog"
        },
        {
            "id": 3815,
            "rarity": 80,
            "type": "treeFrog(7)"
        },
        {
            "id": 3895,
            "rarity": 80,
            "type": "treeFrog(2)"
        },
        {
            "id": 3940,
            "rarity": 80,
            "type": "treeFrog(7)"
        },
        {
            "id": 3948,
            "rarity": 80,
            "type": "grayTreeFrog"
        },
        {
            "id": 3991,
            "rarity": 80,
            "type": "treeFrog(6)"
        },
        {
            "id": 32,
            "rarity": 79,
            "type": "treeFrog(7)"
        },
        {
            "id": 42,
            "rarity": 79,
            "type": "treeFrog(8)"
        },
        {
            "id": 138,
            "rarity": 79,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 143,
            "rarity": 79,
            "type": "greenTreeFrog"
        },
        {
            "id": 145,
            "rarity": 79,
            "type": "greenTreeFrog"
        },
        {
            "id": 185,
            "rarity": 79,
            "type": "treeFrog(8)"
        },
        {
            "id": 342,
            "rarity": 79,
            "type": "treeFrog(2)"
        },
        {
            "id": 354,
            "rarity": 79,
            "type": "goldenTreeFrog"
        },
        {
            "id": 433,
            "rarity": 79,
            "type": "treeFrog(8)"
        },
        {
            "id": 619,
            "rarity": 79,
            "type": "treeFrog(7)"
        },
        {
            "id": 631,
            "rarity": 79,
            "type": "treeFrog(6)"
        },
        {
            "id": 711,
            "rarity": 79,
            "type": "treeFrog(8)"
        },
        {
            "id": 830,
            "rarity": 79,
            "type": "treeFrog(6)"
        },
        {
            "id": 871,
            "rarity": 79,
            "type": "goldenDartFrog"
        },
        {
            "id": 873,
            "rarity": 79,
            "type": "treeFrog(6)"
        },
        {
            "id": 885,
            "rarity": 79,
            "type": "treeFrog(8)"
        },
        {
            "id": 964,
            "rarity": 79,
            "type": "goldenDartFrog"
        },
        {
            "id": 1219,
            "rarity": 79,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1438,
            "rarity": 79,
            "type": "treeFrog(6)"
        },
        {
            "id": 1505,
            "rarity": 79,
            "type": "treeFrog(7)"
        },
        {
            "id": 1551,
            "rarity": 79,
            "type": "treeFrog(5)"
        },
        {
            "id": 1603,
            "rarity": 79,
            "type": "treeFrog(7)"
        },
        {
            "id": 1701,
            "rarity": 79,
            "type": "treeFrog(8)"
        },
        {
            "id": 1743,
            "rarity": 79,
            "type": "treeFrog(6)"
        },
        {
            "id": 1774,
            "rarity": 79,
            "type": "treeFrog(6)"
        },
        {
            "id": 1873,
            "rarity": 79,
            "type": "treeFrog(6)"
        },
        {
            "id": 1922,
            "rarity": 79,
            "type": "grayTreeFrog"
        },
        {
            "id": 1926,
            "rarity": 79,
            "type": "blueTreeFrog"
        },
        {
            "id": 2123,
            "rarity": 79,
            "type": "treeFrog(6)"
        },
        {
            "id": 2273,
            "rarity": 79,
            "type": "treeFrog(6)"
        },
        {
            "id": 2363,
            "rarity": 79,
            "type": "treeFrog(7)"
        },
        {
            "id": 2383,
            "rarity": 79,
            "type": "treeFrog(7)"
        },
        {
            "id": 2546,
            "rarity": 79,
            "type": "treeFrog(8)"
        },
        {
            "id": 2621,
            "rarity": 79,
            "type": "unknown"
        },
        {
            "id": 2650,
            "rarity": 79,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2704,
            "rarity": 79,
            "type": "treeFrog(7)"
        },
        {
            "id": 2710,
            "rarity": 79,
            "type": "brownTreeFrog"
        },
        {
            "id": 2779,
            "rarity": 79,
            "type": "treeFrog(6)"
        },
        {
            "id": 2799,
            "rarity": 79,
            "type": "treeFrog(6)"
        },
        {
            "id": 2816,
            "rarity": 79,
            "type": "treeFrog(8)"
        },
        {
            "id": 2825,
            "rarity": 79,
            "type": "blueTreeFrog"
        },
        {
            "id": 3031,
            "rarity": 79,
            "type": "treeFrog(8)"
        },
        {
            "id": 3084,
            "rarity": 79,
            "type": "brownTreeFrog"
        },
        {
            "id": 3127,
            "rarity": 79,
            "type": "treeFrog(8)"
        },
        {
            "id": 3202,
            "rarity": 79,
            "type": "goldenTreeFrog"
        },
        {
            "id": 3231,
            "rarity": 79,
            "type": "goldenTreeFrog"
        },
        {
            "id": 3424,
            "rarity": 79,
            "type": "treeFrog(6)"
        },
        {
            "id": 3446,
            "rarity": 79,
            "type": "treeFrog(8)"
        },
        {
            "id": 3460,
            "rarity": 79,
            "type": "greenTreeFrog"
        },
        {
            "id": 3468,
            "rarity": 79,
            "type": "treeFrog(7)"
        },
        {
            "id": 3488,
            "rarity": 79,
            "type": "treeFrog(6)"
        },
        {
            "id": 3585,
            "rarity": 79,
            "type": "treeFrog(7)"
        },
        {
            "id": 3605,
            "rarity": 79,
            "type": "unknown"
        },
        {
            "id": 3662,
            "rarity": 79,
            "type": "blueTreeFrog"
        },
        {
            "id": 3726,
            "rarity": 79,
            "type": "treeFrog(8)"
        },
        {
            "id": 3740,
            "rarity": 79,
            "type": "treeFrog(8)"
        },
        {
            "id": 3796,
            "rarity": 79,
            "type": "cyanTreeFrog"
        },
        {
            "id": 4033,
            "rarity": 79,
            "type": "treeFrog(8)"
        },
        {
            "id": 14,
            "rarity": 78,
            "type": "treeFrog(7)"
        },
        {
            "id": 47,
            "rarity": 78,
            "type": "treeFrog(7)"
        },
        {
            "id": 81,
            "rarity": 78,
            "type": "treeFrog(8)"
        },
        {
            "id": 83,
            "rarity": 78,
            "type": "treeFrog(7)"
        },
        {
            "id": 88,
            "rarity": 78,
            "type": "treeFrog(6)"
        },
        {
            "id": 216,
            "rarity": 78,
            "type": "treeFrog(8)"
        },
        {
            "id": 664,
            "rarity": 78,
            "type": "treeFrog(8)"
        },
        {
            "id": 720,
            "rarity": 78,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 778,
            "rarity": 78,
            "type": "treeFrog(8)"
        },
        {
            "id": 894,
            "rarity": 78,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1071,
            "rarity": 78,
            "type": "treeFrog(7)"
        },
        {
            "id": 1134,
            "rarity": 78,
            "type": "treeFrog(8)"
        },
        {
            "id": 1151,
            "rarity": 78,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1195,
            "rarity": 78,
            "type": "treeFrog(8)"
        },
        {
            "id": 1293,
            "rarity": 78,
            "type": "unknown"
        },
        {
            "id": 1339,
            "rarity": 78,
            "type": "treeFrog(8)"
        },
        {
            "id": 1409,
            "rarity": 78,
            "type": "treeFrog(7)"
        },
        {
            "id": 1645,
            "rarity": 78,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1756,
            "rarity": 78,
            "type": "treeFrog(8)"
        },
        {
            "id": 2166,
            "rarity": 78,
            "type": "treeFrog(7)"
        },
        {
            "id": 2317,
            "rarity": 78,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2332,
            "rarity": 78,
            "type": "treeFrog(8)"
        },
        {
            "id": 2587,
            "rarity": 78,
            "type": "treeFrog(8)"
        },
        {
            "id": 2668,
            "rarity": 78,
            "type": "treeFrog(8)"
        },
        {
            "id": 2815,
            "rarity": 78,
            "type": "treeFrog(7)"
        },
        {
            "id": 2960,
            "rarity": 78,
            "type": "treeFrog(7)"
        },
        {
            "id": 3056,
            "rarity": 78,
            "type": "treeFrog(8)"
        },
        {
            "id": 3234,
            "rarity": 78,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3368,
            "rarity": 78,
            "type": "treeFrog(7)"
        },
        {
            "id": 3442,
            "rarity": 78,
            "type": "treeFrog(7)"
        },
        {
            "id": 3504,
            "rarity": 78,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3584,
            "rarity": 78,
            "type": "treeFrog(8)"
        },
        {
            "id": 3660,
            "rarity": 78,
            "type": "treeFrog(7)"
        },
        {
            "id": 3805,
            "rarity": 78,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3937,
            "rarity": 78,
            "type": "treeFrog(8)"
        },
        {
            "id": 3961,
            "rarity": 78,
            "type": "treeFrog(8)"
        },
        {
            "id": 4025,
            "rarity": 78,
            "type": "treeFrog(8)"
        },
        {
            "id": 67,
            "rarity": 77,
            "type": "treeFrog(6)"
        },
        {
            "id": 235,
            "rarity": 77,
            "type": "treeFrog(8)"
        },
        {
            "id": 371,
            "rarity": 77,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 586,
            "rarity": 77,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 680,
            "rarity": 77,
            "type": "treeFrog(6)"
        },
        {
            "id": 890,
            "rarity": 77,
            "type": "treeFrog(8)"
        },
        {
            "id": 1189,
            "rarity": 77,
            "type": "brownTreeFrog"
        },
        {
            "id": 1256,
            "rarity": 77,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1328,
            "rarity": 77,
            "type": "treeFrog(7)"
        },
        {
            "id": 1335,
            "rarity": 77,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1458,
            "rarity": 77,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1744,
            "rarity": 77,
            "type": "treeFrog(6)"
        },
        {
            "id": 1799,
            "rarity": 77,
            "type": "treeFrog(2)"
        },
        {
            "id": 1912,
            "rarity": 77,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2081,
            "rarity": 77,
            "type": "treeFrog(8)"
        },
        {
            "id": 2425,
            "rarity": 77,
            "type": "treeFrog(6)"
        },
        {
            "id": 2590,
            "rarity": 77,
            "type": "treeFrog(8)"
        },
        {
            "id": 2607,
            "rarity": 77,
            "type": "treeFrog(2)"
        },
        {
            "id": 2641,
            "rarity": 77,
            "type": "splendidLeafFrog"
        },
        {
            "id": 2732,
            "rarity": 77,
            "type": "treeFrog(7)"
        },
        {
            "id": 2890,
            "rarity": 77,
            "type": "treeFrog(8)"
        },
        {
            "id": 2899,
            "rarity": 77,
            "type": "treeFrog(2)"
        },
        {
            "id": 2920,
            "rarity": 77,
            "type": "treeFrog(8)"
        },
        {
            "id": 2946,
            "rarity": 77,
            "type": "treeFrog(8)"
        },
        {
            "id": 3137,
            "rarity": 77,
            "type": "treeFrog(7)"
        },
        {
            "id": 3185,
            "rarity": 77,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3348,
            "rarity": 77,
            "type": "cyanTreeFrog"
        },
        {
            "id": 310,
            "rarity": 76,
            "type": "treeFrog(2)"
        },
        {
            "id": 406,
            "rarity": 76,
            "type": "treeFrog(7)"
        },
        {
            "id": 445,
            "rarity": 76,
            "type": "treeFrog(2)"
        },
        {
            "id": 448,
            "rarity": 76,
            "type": "treeFrog(8)"
        },
        {
            "id": 502,
            "rarity": 76,
            "type": "goldenTreeFrog"
        },
        {
            "id": 521,
            "rarity": 76,
            "type": "treeFrog(2)"
        },
        {
            "id": 558,
            "rarity": 76,
            "type": "goldenTreeFrog"
        },
        {
            "id": 777,
            "rarity": 76,
            "type": "treeFrog(7)"
        },
        {
            "id": 827,
            "rarity": 76,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1197,
            "rarity": 76,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1453,
            "rarity": 76,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1497,
            "rarity": 76,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1668,
            "rarity": 76,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1718,
            "rarity": 76,
            "type": "treeFrog(7)"
        },
        {
            "id": 1874,
            "rarity": 76,
            "type": "treeFrog(8)"
        },
        {
            "id": 2325,
            "rarity": 76,
            "type": "goldenTreeFrog"
        },
        {
            "id": 2643,
            "rarity": 76,
            "type": "treeFrog(6)"
        },
        {
            "id": 3209,
            "rarity": 76,
            "type": "treeFrog(2)"
        },
        {
            "id": 3391,
            "rarity": 76,
            "type": "treeFrog(7)"
        },
        {
            "id": 3422,
            "rarity": 76,
            "type": "goldenTreeFrog"
        },
        {
            "id": 3607,
            "rarity": 76,
            "type": "treeFrog(7)"
        },
        {
            "id": 3688,
            "rarity": 76,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3728,
            "rarity": 76,
            "type": "splendidLeafFrog"
        },
        {
            "id": 87,
            "rarity": 75,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 204,
            "rarity": 75,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 487,
            "rarity": 75,
            "type": "cyanTreeFrog"
        },
        {
            "id": 618,
            "rarity": 75,
            "type": "treeFrog(8)"
        },
        {
            "id": 671,
            "rarity": 75,
            "type": "brownTreeFrog"
        },
        {
            "id": 1206,
            "rarity": 75,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1327,
            "rarity": 75,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1393,
            "rarity": 75,
            "type": "treeFrog(8)"
        },
        {
            "id": 1816,
            "rarity": 75,
            "type": "goldenTreeFrog"
        },
        {
            "id": 1954,
            "rarity": 75,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2035,
            "rarity": 75,
            "type": "treeFrog(2)"
        },
        {
            "id": 2067,
            "rarity": 75,
            "type": "splendidLeafFrog"
        },
        {
            "id": 2386,
            "rarity": 75,
            "type": "splendidLeafFrog"
        },
        {
            "id": 2508,
            "rarity": 75,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2514,
            "rarity": 75,
            "type": "treeFrog(1)"
        },
        {
            "id": 2678,
            "rarity": 75,
            "type": "splendidLeafFrog"
        },
        {
            "id": 2735,
            "rarity": 75,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2754,
            "rarity": 75,
            "type": "treeFrog(1)"
        },
        {
            "id": 2840,
            "rarity": 75,
            "type": "treeFrog(6)"
        },
        {
            "id": 2931,
            "rarity": 75,
            "type": "treeFrog(2)"
        },
        {
            "id": 2980,
            "rarity": 75,
            "type": "treeFrog(2)"
        },
        {
            "id": 3094,
            "rarity": 75,
            "type": "treeFrog(2)"
        },
        {
            "id": 3255,
            "rarity": 75,
            "type": "brownTreeFrog"
        },
        {
            "id": 3889,
            "rarity": 75,
            "type": "treeFrog(8)"
        },
        {
            "id": 3952,
            "rarity": 75,
            "type": "treeFrog(8)"
        },
        {
            "id": 4002,
            "rarity": 75,
            "type": "treeFrog(3)"
        },
        {
            "id": 114,
            "rarity": 74,
            "type": "treeFrog(1)"
        },
        {
            "id": 321,
            "rarity": 74,
            "type": "splendidLeafFrog"
        },
        {
            "id": 332,
            "rarity": 74,
            "type": "treeFrog(3)"
        },
        {
            "id": 493,
            "rarity": 74,
            "type": "treeFrog(2)"
        },
        {
            "id": 911,
            "rarity": 74,
            "type": "treeFrog(1)"
        },
        {
            "id": 980,
            "rarity": 74,
            "type": "treeFrog(3)"
        },
        {
            "id": 1016,
            "rarity": 74,
            "type": "treeFrog(2)"
        },
        {
            "id": 1065,
            "rarity": 74,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1430,
            "rarity": 74,
            "type": "treeFrog(5)"
        },
        {
            "id": 1962,
            "rarity": 74,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3123,
            "rarity": 74,
            "type": "treeFrog(2)"
        },
        {
            "id": 3705,
            "rarity": 74,
            "type": "treeFrog(1)"
        },
        {
            "id": 3825,
            "rarity": 74,
            "type": "treeFrog(2)"
        },
        {
            "id": 3981,
            "rarity": 74,
            "type": "splendidLeafFrog"
        },
        {
            "id": 43,
            "rarity": 73,
            "type": "treeFrog(3)"
        },
        {
            "id": 361,
            "rarity": 73,
            "type": "treeFrog(4)"
        },
        {
            "id": 544,
            "rarity": 73,
            "type": "splendidLeafFrog"
        },
        {
            "id": 601,
            "rarity": 73,
            "type": "treeFrog(4)"
        },
        {
            "id": 1194,
            "rarity": 73,
            "type": "treeFrog(1)"
        },
        {
            "id": 1237,
            "rarity": 73,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1272,
            "rarity": 73,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1288,
            "rarity": 73,
            "type": "splendidLeafFrog"
        },
        {
            "id": 1490,
            "rarity": 73,
            "type": "treeFrog(8)"
        },
        {
            "id": 1842,
            "rarity": 73,
            "type": "treeFrog(3)"
        },
        {
            "id": 2671,
            "rarity": 73,
            "type": "splendidLeafFrog"
        },
        {
            "id": 2715,
            "rarity": 73,
            "type": "treeFrog(1)"
        },
        {
            "id": 2752,
            "rarity": 73,
            "type": "treeFrog(2)"
        },
        {
            "id": 2914,
            "rarity": 73,
            "type": "splendidLeafFrog"
        },
        {
            "id": 3296,
            "rarity": 73,
            "type": "treeFrog(1)"
        },
        {
            "id": 3507,
            "rarity": 73,
            "type": "treeFrog(1)"
        },
        {
            "id": 322,
            "rarity": 72,
            "type": "treeFrog(3)"
        },
        {
            "id": 364,
            "rarity": 72,
            "type": "treeFrog(2)"
        },
        {
            "id": 663,
            "rarity": 72,
            "type": "treeFrog(3)"
        },
        {
            "id": 805,
            "rarity": 72,
            "type": "splendidLeafFrog"
        },
        {
            "id": 816,
            "rarity": 72,
            "type": "treeFrog(1)"
        },
        {
            "id": 1317,
            "rarity": 72,
            "type": "treeFrog(2)"
        },
        {
            "id": 2364,
            "rarity": 72,
            "type": "treeFrog(4)"
        },
        {
            "id": 2387,
            "rarity": 72,
            "type": "treeFrog(1)"
        },
        {
            "id": 2563,
            "rarity": 72,
            "type": "treeFrog(1)"
        },
        {
            "id": 2848,
            "rarity": 72,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2957,
            "rarity": 72,
            "type": "treeFrog(2)"
        },
        {
            "id": 2961,
            "rarity": 72,
            "type": "treeFrog(2)"
        },
        {
            "id": 3418,
            "rarity": 72,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3561,
            "rarity": 72,
            "type": "treeFrog(2)"
        },
        {
            "id": 296,
            "rarity": 71,
            "type": "purpleTreeFrog"
        },
        {
            "id": 550,
            "rarity": 71,
            "type": "treeFrog(1)"
        },
        {
            "id": 826,
            "rarity": 71,
            "type": "purpleTreeFrog"
        },
        {
            "id": 865,
            "rarity": 71,
            "type": "treeFrog(5)"
        },
        {
            "id": 975,
            "rarity": 71,
            "type": "treeFrog(2)"
        },
        {
            "id": 1227,
            "rarity": 71,
            "type": "treeFrog(5)"
        },
        {
            "id": 1445,
            "rarity": 71,
            "type": "treeFrog(4)"
        },
        {
            "id": 1739,
            "rarity": 71,
            "type": "treeFrog(1)"
        },
        {
            "id": 1776,
            "rarity": 71,
            "type": "treeFrog(1)"
        },
        {
            "id": 2110,
            "rarity": 71,
            "type": "treeFrog(4)"
        },
        {
            "id": 2194,
            "rarity": 71,
            "type": "treeFrog(3)"
        },
        {
            "id": 2223,
            "rarity": 71,
            "type": "treeFrog(3)"
        },
        {
            "id": 2333,
            "rarity": 71,
            "type": "treeFrog(3)"
        },
        {
            "id": 2484,
            "rarity": 71,
            "type": "treeFrog(2)"
        },
        {
            "id": 2781,
            "rarity": 71,
            "type": "treeFrog(3)"
        },
        {
            "id": 2965,
            "rarity": 71,
            "type": "treeFrog(2)"
        },
        {
            "id": 3036,
            "rarity": 71,
            "type": "treeFrog(2)"
        },
        {
            "id": 3259,
            "rarity": 71,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3374,
            "rarity": 71,
            "type": "treeFrog(1)"
        },
        {
            "id": 3413,
            "rarity": 71,
            "type": "treeFrog(1)"
        },
        {
            "id": 3491,
            "rarity": 71,
            "type": "treeFrog(1)"
        },
        {
            "id": 3959,
            "rarity": 71,
            "type": "treeFrog(2)"
        },
        {
            "id": 367,
            "rarity": 70,
            "type": "treeFrog(3)"
        },
        {
            "id": 526,
            "rarity": 70,
            "type": "treeFrog(3)"
        },
        {
            "id": 661,
            "rarity": 70,
            "type": "purpleTreeFrog"
        },
        {
            "id": 886,
            "rarity": 70,
            "type": "treeFrog(2)"
        },
        {
            "id": 1058,
            "rarity": 70,
            "type": "treeFrog(3)"
        },
        {
            "id": 1088,
            "rarity": 70,
            "type": "treeFrog(2)"
        },
        {
            "id": 1251,
            "rarity": 70,
            "type": "treeFrog(2)"
        },
        {
            "id": 1404,
            "rarity": 70,
            "type": "treeFrog(4)"
        },
        {
            "id": 1420,
            "rarity": 70,
            "type": "treeFrog(3)"
        },
        {
            "id": 2395,
            "rarity": 70,
            "type": "treeFrog(4)"
        },
        {
            "id": 2407,
            "rarity": 70,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2497,
            "rarity": 70,
            "type": "treeFrog(4)"
        },
        {
            "id": 2884,
            "rarity": 70,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3193,
            "rarity": 70,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3301,
            "rarity": 70,
            "type": "treeFrog(1)"
        },
        {
            "id": 3414,
            "rarity": 70,
            "type": "treeFrog(3)"
        },
        {
            "id": 3590,
            "rarity": 70,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3595,
            "rarity": 70,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3913,
            "rarity": 70,
            "type": "treeFrog(3)"
        },
        {
            "id": 54,
            "rarity": 69,
            "type": "treeFrog(3)"
        },
        {
            "id": 60,
            "rarity": 69,
            "type": "treeFrog(3)"
        },
        {
            "id": 196,
            "rarity": 69,
            "type": "orangeTreeFrog"
        },
        {
            "id": 531,
            "rarity": 69,
            "type": "treeFrog(4)"
        },
        {
            "id": 583,
            "rarity": 69,
            "type": "treeFrog(3)"
        },
        {
            "id": 755,
            "rarity": 69,
            "type": "stawberryDartFrog"
        },
        {
            "id": 780,
            "rarity": 69,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1562,
            "rarity": 69,
            "type": "treeFrog(4)"
        },
        {
            "id": 1626,
            "rarity": 69,
            "type": "blueDartFrog"
        },
        {
            "id": 1679,
            "rarity": 69,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1870,
            "rarity": 69,
            "type": "blueDartFrog"
        },
        {
            "id": 2298,
            "rarity": 69,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2391,
            "rarity": 69,
            "type": "treeFrog(4)"
        },
        {
            "id": 2492,
            "rarity": 69,
            "type": "treeFrog(5)"
        },
        {
            "id": 2634,
            "rarity": 69,
            "type": "treeFrog(4)"
        },
        {
            "id": 2636,
            "rarity": 69,
            "type": "treeFrog(4)"
        },
        {
            "id": 2669,
            "rarity": 69,
            "type": "treeFrog(3)"
        },
        {
            "id": 2798,
            "rarity": 69,
            "type": "treeFrog(5)"
        },
        {
            "id": 3001,
            "rarity": 69,
            "type": "treeFrog(4)"
        },
        {
            "id": 3159,
            "rarity": 69,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3428,
            "rarity": 69,
            "type": "treeFrog(2)"
        },
        {
            "id": 3580,
            "rarity": 69,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3633,
            "rarity": 69,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3666,
            "rarity": 69,
            "type": "treeFrog(3)"
        },
        {
            "id": 3803,
            "rarity": 69,
            "type": "treeFrog(5)"
        },
        {
            "id": 3916,
            "rarity": 69,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3975,
            "rarity": 69,
            "type": "orangeTreeFrog"
        },
        {
            "id": 126,
            "rarity": 68,
            "type": "treeFrog(3)"
        },
        {
            "id": 210,
            "rarity": 68,
            "type": "treeFrog(2)"
        },
        {
            "id": 284,
            "rarity": 68,
            "type": "treeFrog(4)"
        },
        {
            "id": 390,
            "rarity": 68,
            "type": "treeFrog(2)"
        },
        {
            "id": 483,
            "rarity": 68,
            "type": "treeFrog(2)"
        },
        {
            "id": 682,
            "rarity": 68,
            "type": "pinkTreeFrog"
        },
        {
            "id": 743,
            "rarity": 68,
            "type": "purpleTreeFrog"
        },
        {
            "id": 941,
            "rarity": 68,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1068,
            "rarity": 68,
            "type": "treeFrog(2)"
        },
        {
            "id": 1109,
            "rarity": 68,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1287,
            "rarity": 68,
            "type": "blueDartFrog"
        },
        {
            "id": 1419,
            "rarity": 68,
            "type": "treeFrog(4)"
        },
        {
            "id": 1454,
            "rarity": 68,
            "type": "treeFrog(2)"
        },
        {
            "id": 1485,
            "rarity": 68,
            "type": "treeFrog(2)"
        },
        {
            "id": 1512,
            "rarity": 68,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1577,
            "rarity": 68,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1581,
            "rarity": 68,
            "type": "purpleTreeFrog"
        },
        {
            "id": 1606,
            "rarity": 68,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1670,
            "rarity": 68,
            "type": "blueDartFrog"
        },
        {
            "id": 1826,
            "rarity": 68,
            "type": "treeFrog(4)"
        },
        {
            "id": 1868,
            "rarity": 68,
            "type": "treeFrog(6)"
        },
        {
            "id": 1999,
            "rarity": 68,
            "type": "treeFrog(4)"
        },
        {
            "id": 2008,
            "rarity": 68,
            "type": "treeFrog(3)"
        },
        {
            "id": 2019,
            "rarity": 68,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2376,
            "rarity": 68,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2652,
            "rarity": 68,
            "type": "orangeTreeFrog"
        },
        {
            "id": 2739,
            "rarity": 68,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2994,
            "rarity": 68,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3000,
            "rarity": 68,
            "type": "treeFrog(2)"
        },
        {
            "id": 3256,
            "rarity": 68,
            "type": "treeFrog(4)"
        },
        {
            "id": 3286,
            "rarity": 68,
            "type": "purpleTreeFrog"
        },
        {
            "id": 3393,
            "rarity": 68,
            "type": "treeFrog(4)"
        },
        {
            "id": 3398,
            "rarity": 68,
            "type": "treeFrog(2)"
        },
        {
            "id": 3559,
            "rarity": 68,
            "type": "treeFrog(2)"
        },
        {
            "id": 3748,
            "rarity": 68,
            "type": "treeFrog(6)"
        },
        {
            "id": 3792,
            "rarity": 68,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3932,
            "rarity": 68,
            "type": "treeFrog(5)"
        },
        {
            "id": 3938,
            "rarity": 68,
            "type": "treeFrog(5)"
        },
        {
            "id": 52,
            "rarity": 67,
            "type": "treeFrog(4)"
        },
        {
            "id": 363,
            "rarity": 67,
            "type": "treeFrog(2)"
        },
        {
            "id": 449,
            "rarity": 67,
            "type": "treeFrog(5)"
        },
        {
            "id": 573,
            "rarity": 67,
            "type": "treeFrog(5)"
        },
        {
            "id": 662,
            "rarity": 67,
            "type": "treeFrog(2)"
        },
        {
            "id": 811,
            "rarity": 67,
            "type": "stawberryDartFrog"
        },
        {
            "id": 884,
            "rarity": 67,
            "type": "orangeTreeFrog"
        },
        {
            "id": 897,
            "rarity": 67,
            "type": "blueDartFrog"
        },
        {
            "id": 1106,
            "rarity": 67,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1359,
            "rarity": 67,
            "type": "treeFrog(3)"
        },
        {
            "id": 1482,
            "rarity": 67,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1700,
            "rarity": 67,
            "type": "grayTreeFrog"
        },
        {
            "id": 1719,
            "rarity": 67,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1808,
            "rarity": 67,
            "type": "treeFrog(2)"
        },
        {
            "id": 1853,
            "rarity": 67,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1969,
            "rarity": 67,
            "type": "treeFrog(5)"
        },
        {
            "id": 2073,
            "rarity": 67,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2148,
            "rarity": 67,
            "type": "tomatoFrog"
        },
        {
            "id": 2274,
            "rarity": 67,
            "type": "treeFrog(7)"
        },
        {
            "id": 2301,
            "rarity": 67,
            "type": "treeFrog(5)"
        },
        {
            "id": 2344,
            "rarity": 67,
            "type": "purpleTreeFrog"
        },
        {
            "id": 2486,
            "rarity": 67,
            "type": "blueDartFrog"
        },
        {
            "id": 2523,
            "rarity": 67,
            "type": "treeFrog(5)"
        },
        {
            "id": 2579,
            "rarity": 67,
            "type": "blueDartFrog"
        },
        {
            "id": 2598,
            "rarity": 67,
            "type": "treeFrog(5)"
        },
        {
            "id": 2642,
            "rarity": 67,
            "type": "blueDartFrog"
        },
        {
            "id": 2647,
            "rarity": 67,
            "type": "treeFrog(6)"
        },
        {
            "id": 2667,
            "rarity": 67,
            "type": "treeFrog(3)"
        },
        {
            "id": 2744,
            "rarity": 67,
            "type": "tomatoFrog"
        },
        {
            "id": 2795,
            "rarity": 67,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3131,
            "rarity": 67,
            "type": "treeFrog(3)"
        },
        {
            "id": 3143,
            "rarity": 67,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3346,
            "rarity": 67,
            "type": "grayTreeFrog"
        },
        {
            "id": 3389,
            "rarity": 67,
            "type": "treeFrog(2)"
        },
        {
            "id": 3556,
            "rarity": 67,
            "type": "treeFrog(5)"
        },
        {
            "id": 3565,
            "rarity": 67,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3717,
            "rarity": 67,
            "type": "treeFrog(2)"
        },
        {
            "id": 3928,
            "rarity": 67,
            "type": "treeFrog(5)"
        },
        {
            "id": 4006,
            "rarity": 67,
            "type": "pinkTreeFrog"
        },
        {
            "id": 119,
            "rarity": 66,
            "type": "treeFrog(4)"
        },
        {
            "id": 153,
            "rarity": 66,
            "type": "treeFrog(6)"
        },
        {
            "id": 183,
            "rarity": 66,
            "type": "orangeTreeFrog"
        },
        {
            "id": 198,
            "rarity": 66,
            "type": "blueDartFrog"
        },
        {
            "id": 315,
            "rarity": 66,
            "type": "treeFrog(3)"
        },
        {
            "id": 462,
            "rarity": 66,
            "type": "blueTreeFrog"
        },
        {
            "id": 529,
            "rarity": 66,
            "type": "pinkTreeFrog"
        },
        {
            "id": 545,
            "rarity": 66,
            "type": "treeFrog(6)"
        },
        {
            "id": 554,
            "rarity": 66,
            "type": "unknown"
        },
        {
            "id": 651,
            "rarity": 66,
            "type": "greenTreeFrog"
        },
        {
            "id": 708,
            "rarity": 66,
            "type": "blueDartFrog"
        },
        {
            "id": 748,
            "rarity": 66,
            "type": "treeFrog(4)"
        },
        {
            "id": 756,
            "rarity": 66,
            "type": "orangeTreeFrog"
        },
        {
            "id": 820,
            "rarity": 66,
            "type": "treeFrog(4)"
        },
        {
            "id": 923,
            "rarity": 66,
            "type": "pinkTreeFrog"
        },
        {
            "id": 942,
            "rarity": 66,
            "type": "orangeTreeFrog"
        },
        {
            "id": 1089,
            "rarity": 66,
            "type": "treeFrog(3)"
        },
        {
            "id": 1442,
            "rarity": 66,
            "type": "treeFrog(7)"
        },
        {
            "id": 1531,
            "rarity": 66,
            "type": "goldenDartFrog"
        },
        {
            "id": 1627,
            "rarity": 66,
            "type": "treeFrog(5)"
        },
        {
            "id": 1641,
            "rarity": 66,
            "type": "tomatoFrog"
        },
        {
            "id": 1686,
            "rarity": 66,
            "type": "treeFrog(5)"
        },
        {
            "id": 1696,
            "rarity": 66,
            "type": "treeFrog(6)"
        },
        {
            "id": 1806,
            "rarity": 66,
            "type": "treeFrog(5)"
        },
        {
            "id": 1898,
            "rarity": 66,
            "type": "treeFrog(4)"
        },
        {
            "id": 1924,
            "rarity": 66,
            "type": "blueTreeFrog"
        },
        {
            "id": 2057,
            "rarity": 66,
            "type": "greenTreeFrog"
        },
        {
            "id": 2149,
            "rarity": 66,
            "type": "treeFrog(4)"
        },
        {
            "id": 2150,
            "rarity": 66,
            "type": "treeFrog(2)"
        },
        {
            "id": 2172,
            "rarity": 66,
            "type": "unknown"
        },
        {
            "id": 2253,
            "rarity": 66,
            "type": "grayTreeFrog"
        },
        {
            "id": 2504,
            "rarity": 66,
            "type": "treeFrog(2)"
        },
        {
            "id": 2518,
            "rarity": 66,
            "type": "treeFrog(3)"
        },
        {
            "id": 2570,
            "rarity": 66,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2625,
            "rarity": 66,
            "type": "treeFrog(5)"
        },
        {
            "id": 2771,
            "rarity": 66,
            "type": "treeFrog(5)"
        },
        {
            "id": 2923,
            "rarity": 66,
            "type": "tomatoFrog"
        },
        {
            "id": 2935,
            "rarity": 66,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2958,
            "rarity": 66,
            "type": "treeFrog(8)"
        },
        {
            "id": 3077,
            "rarity": 66,
            "type": "goldenDartFrog"
        },
        {
            "id": 3126,
            "rarity": 66,
            "type": "treeFrog(5)"
        },
        {
            "id": 3145,
            "rarity": 66,
            "type": "treeFrog(7)"
        },
        {
            "id": 3260,
            "rarity": 66,
            "type": "treeFrog(6)"
        },
        {
            "id": 3342,
            "rarity": 66,
            "type": "treeFrog(4)"
        },
        {
            "id": 3453,
            "rarity": 66,
            "type": "treeFrog(4)"
        },
        {
            "id": 3528,
            "rarity": 66,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3536,
            "rarity": 66,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3779,
            "rarity": 66,
            "type": "tomatoFrog"
        },
        {
            "id": 3786,
            "rarity": 66,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3856,
            "rarity": 66,
            "type": "stawberryDartFrog"
        },
        {
            "id": 3872,
            "rarity": 66,
            "type": "grayTreeFrog"
        },
        {
            "id": 3876,
            "rarity": 66,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3934,
            "rarity": 66,
            "type": "treeFrog(2)"
        },
        {
            "id": 3997,
            "rarity": 66,
            "type": "blueDartFrog"
        },
        {
            "id": 58,
            "rarity": 65,
            "type": "greenTreeFrog"
        },
        {
            "id": 227,
            "rarity": 65,
            "type": "treeFrog(4)"
        },
        {
            "id": 239,
            "rarity": 65,
            "type": "tomatoFrog"
        },
        {
            "id": 309,
            "rarity": 65,
            "type": "treeFrog(6)"
        },
        {
            "id": 362,
            "rarity": 65,
            "type": "treeFrog(6)"
        },
        {
            "id": 475,
            "rarity": 65,
            "type": "treeFrog(3)"
        },
        {
            "id": 582,
            "rarity": 65,
            "type": "treeFrog(6)"
        },
        {
            "id": 643,
            "rarity": 65,
            "type": "treeFrog(7)"
        },
        {
            "id": 656,
            "rarity": 65,
            "type": "blueTreeFrog"
        },
        {
            "id": 686,
            "rarity": 65,
            "type": "goldenDartFrog"
        },
        {
            "id": 779,
            "rarity": 65,
            "type": "treeFrog(6)"
        },
        {
            "id": 785,
            "rarity": 65,
            "type": "blueTreeFrog"
        },
        {
            "id": 800,
            "rarity": 65,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 801,
            "rarity": 65,
            "type": "unknown"
        },
        {
            "id": 846,
            "rarity": 65,
            "type": "grayTreeFrog"
        },
        {
            "id": 1069,
            "rarity": 65,
            "type": "stawberryDartFrog"
        },
        {
            "id": 1212,
            "rarity": 65,
            "type": "blueDartFrog"
        },
        {
            "id": 1248,
            "rarity": 65,
            "type": "greenTreeFrog"
        },
        {
            "id": 1292,
            "rarity": 65,
            "type": "treeFrog(2)"
        },
        {
            "id": 1389,
            "rarity": 65,
            "type": "treeFrog(3)"
        },
        {
            "id": 1619,
            "rarity": 65,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1703,
            "rarity": 65,
            "type": "treeFrog(6)"
        },
        {
            "id": 1820,
            "rarity": 65,
            "type": "grayTreeFrog"
        },
        {
            "id": 1835,
            "rarity": 65,
            "type": "unknown"
        },
        {
            "id": 1866,
            "rarity": 65,
            "type": "treeFrog(3)"
        },
        {
            "id": 1869,
            "rarity": 65,
            "type": "treeFrog(7)"
        },
        {
            "id": 1882,
            "rarity": 65,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1981,
            "rarity": 65,
            "type": "blueDartFrog"
        },
        {
            "id": 2082,
            "rarity": 65,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2092,
            "rarity": 65,
            "type": "grayTreeFrog"
        },
        {
            "id": 2164,
            "rarity": 65,
            "type": "greenTreeFrog"
        },
        {
            "id": 2204,
            "rarity": 65,
            "type": "blueDartFrog"
        },
        {
            "id": 2312,
            "rarity": 65,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2320,
            "rarity": 65,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2409,
            "rarity": 65,
            "type": "tomatoFrog"
        },
        {
            "id": 2453,
            "rarity": 65,
            "type": "blueDartFrog"
        },
        {
            "id": 2455,
            "rarity": 65,
            "type": "treeFrog(8)"
        },
        {
            "id": 2536,
            "rarity": 65,
            "type": "treeFrog(5)"
        },
        {
            "id": 2586,
            "rarity": 65,
            "type": "treeFrog(5)"
        },
        {
            "id": 2605,
            "rarity": 65,
            "type": "treeFrog(3)"
        },
        {
            "id": 2712,
            "rarity": 65,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2817,
            "rarity": 65,
            "type": "goldenDartFrog"
        },
        {
            "id": 2841,
            "rarity": 65,
            "type": "treeFrog(4)"
        },
        {
            "id": 2851,
            "rarity": 65,
            "type": "pinkTreeFrog"
        },
        {
            "id": 2886,
            "rarity": 65,
            "type": "treeFrog(7)"
        },
        {
            "id": 2950,
            "rarity": 65,
            "type": "treeFrog(2)"
        },
        {
            "id": 2955,
            "rarity": 65,
            "type": "stawberryDartFrog"
        },
        {
            "id": 2974,
            "rarity": 65,
            "type": "blueTreeFrog"
        },
        {
            "id": 2990,
            "rarity": 65,
            "type": "treeFrog(3)"
        },
        {
            "id": 3038,
            "rarity": 65,
            "type": "tomatoFrog"
        },
        {
            "id": 3104,
            "rarity": 65,
            "type": "stawberryDartFrog"
        },
        {
            "id": 3174,
            "rarity": 65,
            "type": "treeFrog(7)"
        },
        {
            "id": 3196,
            "rarity": 65,
            "type": "treeFrog(3)"
        },
        {
            "id": 3206,
            "rarity": 65,
            "type": "treeFrog(3)"
        },
        {
            "id": 3265,
            "rarity": 65,
            "type": "treeFrog(8)"
        },
        {
            "id": 3382,
            "rarity": 65,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3397,
            "rarity": 65,
            "type": "grayTreeFrog"
        },
        {
            "id": 3409,
            "rarity": 65,
            "type": "blueDartFrog"
        },
        {
            "id": 3501,
            "rarity": 65,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3663,
            "rarity": 65,
            "type": "treeFrog(5)"
        },
        {
            "id": 3673,
            "rarity": 65,
            "type": "orangeTreeFrog"
        },
        {
            "id": 3691,
            "rarity": 65,
            "type": "treeFrog(3)"
        },
        {
            "id": 3782,
            "rarity": 65,
            "type": "blueDartFrog"
        },
        {
            "id": 3810,
            "rarity": 65,
            "type": "treeFrog(4)"
        },
        {
            "id": 3839,
            "rarity": 65,
            "type": "treeFrog(5)"
        },
        {
            "id": 3863,
            "rarity": 65,
            "type": "treeFrog(6)"
        },
        {
            "id": 3944,
            "rarity": 65,
            "type": "pinkTreeFrog"
        },
        {
            "id": 3955,
            "rarity": 65,
            "type": "tomatoFrog"
        },
        {
            "id": 3957,
            "rarity": 65,
            "type": "treeFrog(6)"
        },
        {
            "id": 106,
            "rarity": 64,
            "type": "treeFrog(3)"
        },
        {
            "id": 112,
            "rarity": 64,
            "type": "treeFrog(6)"
        },
        {
            "id": 118,
            "rarity": 64,
            "type": "treeFrog(3)"
        },
        {
            "id": 122,
            "rarity": 64,
            "type": "treeFrog(4)"
        },
        {
            "id": 301,
            "rarity": 64,
            "type": "treeFrog(8)"
        },
        {
            "id": 305,
            "rarity": 64,
            "type": "treeFrog(4)"
        },
        {
            "id": 356,
            "rarity": 64,
            "type": "treeFrog(6)"
        },
        {
            "id": 576,
            "rarity": 64,
            "type": "grayTreeFrog"
        },
        {
            "id": 600,
            "rarity": 64,
            "type": "treeFrog(4)"
        },
        {
            "id": 659,
            "rarity": 64,
            "type": "greenTreeFrog"
        },
        {
            "id": 766,
            "rarity": 64,
            "type": "treeFrog(7)"
        },
        {
            "id": 859,
            "rarity": 64,
            "type": "grayTreeFrog"
        },
        {
            "id": 922,
            "rarity": 64,
            "type": "treeFrog(5)"
        },
        {
            "id": 971,
            "rarity": 64,
            "type": "grayTreeFrog"
        },
        {
            "id": 983,
            "rarity": 64,
            "type": "goldenDartFrog"
        },
        {
            "id": 1022,
            "rarity": 64,
            "type": "blueTreeFrog"
        },
        {
            "id": 1082,
            "rarity": 64,
            "type": "goldenDartFrog"
        },
        {
            "id": 1114,
            "rarity": 64,
            "type": "treeFrog(8)"
        },
        {
            "id": 1130,
            "rarity": 64,
            "type": "treeFrog(4)"
        },
        {
            "id": 1199,
            "rarity": 64,
            "type": "treeFrog(7)"
        },
        {
            "id": 1238,
            "rarity": 64,
            "type": "treeFrog(5)"
        },
        {
            "id": 1304,
            "rarity": 64,
            "type": "treeFrog(8)"
        },
        {
            "id": 1372,
            "rarity": 64,
            "type": "treeFrog(8)"
        },
        {
            "id": 1411,
            "rarity": 64,
            "type": "treeFrog(8)"
        },
        {
            "id": 1433,
            "rarity": 64,
            "type": "treeFrog(5)"
        },
        {
            "id": 1539,
            "rarity": 64,
            "type": "treeFrog(5)"
        },
        {
            "id": 1699,
            "rarity": 64,
            "type": "tomatoFrog"
        },
        {
            "id": 1736,
            "rarity": 64,
            "type": "treeFrog(4)"
        },
        {
            "id": 1742,
            "rarity": 64,
            "type": "treeFrog(7)"
        },
        {
            "id": 1843,
            "rarity": 64,
            "type": "unknown"
        },
        {
            "id": 1875,
            "rarity": 64,
            "type": "pinkTreeFrog"
        },
        {
            "id": 1889,
            "rarity": 64,
            "type": "treeFrog(6)"
        },
        {
            "id": 1931,
            "rarity": 64,
            "type": "blueTreeFrog"
        },
        {
            "id": 1952,
            "rarity": 64,
            "type": "goldenDartFrog"
        },
        {
            "id": 2022,
            "rarity": 64,
            "type": "greenTreeFrog"
        },
        {
            "id": 2058,
            "rarity": 64,
            "type": "greenTreeFrog"
        },
        {
            "id": 2138,
            "rarity": 64,
            "type": "treeFrog(5)"
        },
        {
            "id": 2161,
            "rarity": 64,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2168,
            "rarity": 64,
            "type": "unknown"
        },
        {
            "id": 2212,
            "rarity": 64,
            "type": "treeFrog(6)"
        },
        {
            "id": 2457,
            "rarity": 64,
            "type": "blueDartFrog"
        },
        {
            "id": 2465,
            "rarity": 64,
            "type": "treeFrog(6)"
        },
        {
            "id": 2510,
            "rarity": 64,
            "type": "blueTreeFrog"
        },
        {
            "id": 2524,
            "rarity": 64,
            "type": "treeFrog(3)"
        },
        {
            "id": 2537,
            "rarity": 64,
            "type": "treeFrog(7)"
        },
        {
            "id": 2611,
            "rarity": 64,
            "type": "unknown"
        },
        {
            "id": 2686,
            "rarity": 64,
            "type": "greenTreeFrog"
        },
        {
            "id": 2824,
            "rarity": 64,
            "type": "treeFrog(4)"
        },
        {
            "id": 2976,
            "rarity": 64,
            "type": "treeFrog(8)"
        },
        {
            "id": 3101,
            "rarity": 64,
            "type": "treeFrog(3)"
        },
        {
            "id": 3198,
            "rarity": 64,
            "type": "blueTreeFrog"
        },
        {
            "id": 3226,
            "rarity": 64,
            "type": "treeFrog(4)"
        },
        {
            "id": 3534,
            "rarity": 64,
            "type": "unknown"
        },
        {
            "id": 3550,
            "rarity": 64,
            "type": "tomatoFrog"
        },
        {
            "id": 3608,
            "rarity": 64,
            "type": "goldenDartFrog"
        },
        {
            "id": 3647,
            "rarity": 64,
            "type": "treeFrog(7)"
        },
        {
            "id": 3694,
            "rarity": 64,
            "type": "stawberryDartFrog"
        },
        {
            "id": 3721,
            "rarity": 64,
            "type": "tomatoFrog"
        },
        {
            "id": 3760,
            "rarity": 64,
            "type": "treeFrog(5)"
        },
        {
            "id": 3845,
            "rarity": 64,
            "type": "treeFrog(6)"
        },
        {
            "id": 3982,
            "rarity": 64,
            "type": "treeFrog(5)"
        },
        {
            "id": 4007,
            "rarity": 64,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 56,
            "rarity": 63,
            "type": "treeFrog(3)"
        },
        {
            "id": 146,
            "rarity": 63,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 159,
            "rarity": 63,
            "type": "unknown"
        },
        {
            "id": 374,
            "rarity": 63,
            "type": "treeFrog(7)"
        },
        {
            "id": 379,
            "rarity": 63,
            "type": "treeFrog(7)"
        },
        {
            "id": 401,
            "rarity": 63,
            "type": "treeFrog(3)"
        },
        {
            "id": 597,
            "rarity": 63,
            "type": "treeFrog(4)"
        },
        {
            "id": 599,
            "rarity": 63,
            "type": "treeFrog(8)"
        },
        {
            "id": 611,
            "rarity": 63,
            "type": "blueTreeFrog"
        },
        {
            "id": 615,
            "rarity": 63,
            "type": "treeFrog(3)"
        },
        {
            "id": 806,
            "rarity": 63,
            "type": "tomatoFrog"
        },
        {
            "id": 819,
            "rarity": 63,
            "type": "treeFrog(6)"
        },
        {
            "id": 833,
            "rarity": 63,
            "type": "treeFrog(8)"
        },
        {
            "id": 880,
            "rarity": 63,
            "type": "treeFrog(4)"
        },
        {
            "id": 927,
            "rarity": 63,
            "type": "tomatoFrog"
        },
        {
            "id": 972,
            "rarity": 63,
            "type": "treeFrog(5)"
        },
        {
            "id": 992,
            "rarity": 63,
            "type": "treeFrog(7)"
        },
        {
            "id": 1005,
            "rarity": 63,
            "type": "treeFrog(8)"
        },
        {
            "id": 1049,
            "rarity": 63,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 1094,
            "rarity": 63,
            "type": "treeFrog(7)"
        },
        {
            "id": 1104,
            "rarity": 63,
            "type": "treeFrog(6)"
        },
        {
            "id": 1211,
            "rarity": 63,
            "type": "treeFrog(3)"
        },
        {
            "id": 1262,
            "rarity": 63,
            "type": "treeFrog(7)"
        },
        {
            "id": 1395,
            "rarity": 63,
            "type": "treeFrog(4)"
        },
        {
            "id": 1501,
            "rarity": 63,
            "type": "treeFrog(2)"
        },
        {
            "id": 1518,
            "rarity": 63,
            "type": "tomatoFrog"
        },
        {
            "id": 1521,
            "rarity": 63,
            "type": "greenTreeFrog"
        },
        {
            "id": 1680,
            "rarity": 63,
            "type": "treeFrog(3)"
        },
        {
            "id": 1762,
            "rarity": 63,
            "type": "treeFrog(5)"
        },
        {
            "id": 1809,
            "rarity": 63,
            "type": "goldenDartFrog"
        },
        {
            "id": 1958,
            "rarity": 63,
            "type": "unknown"
        },
        {
            "id": 1963,
            "rarity": 63,
            "type": "blueTreeFrog"
        },
        {
            "id": 2089,
            "rarity": 63,
            "type": "treeFrog(7)"
        },
        {
            "id": 2139,
            "rarity": 63,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2153,
            "rarity": 63,
            "type": "treeFrog(7)"
        },
        {
            "id": 2309,
            "rarity": 63,
            "type": "grayTreeFrog"
        },
        {
            "id": 2347,
            "rarity": 63,
            "type": "treeFrog(8)"
        },
        {
            "id": 2397,
            "rarity": 63,
            "type": "treeFrog(3)"
        },
        {
            "id": 2461,
            "rarity": 63,
            "type": "treeFrog(7)"
        },
        {
            "id": 2489,
            "rarity": 63,
            "type": "grayTreeFrog"
        },
        {
            "id": 2495,
            "rarity": 63,
            "type": "treeFrog(6)"
        },
        {
            "id": 2507,
            "rarity": 63,
            "type": "grayTreeFrog"
        },
        {
            "id": 2517,
            "rarity": 63,
            "type": "goldenDartFrog"
        },
        {
            "id": 2571,
            "rarity": 63,
            "type": "treeFrog(7)"
        },
        {
            "id": 2617,
            "rarity": 63,
            "type": "treeFrog(2)"
        },
        {
            "id": 2623,
            "rarity": 63,
            "type": "treeFrog(7)"
        },
        {
            "id": 2635,
            "rarity": 63,
            "type": "treeFrog(7)"
        },
        {
            "id": 2829,
            "rarity": 63,
            "type": "goldenDartFrog"
        },
        {
            "id": 2867,
            "rarity": 63,
            "type": "treeFrog(3)"
        },
        {
            "id": 2885,
            "rarity": 63,
            "type": "unknown"
        },
        {
            "id": 2895,
            "rarity": 63,
            "type": "treeFrog(3)"
        },
        {
            "id": 3164,
            "rarity": 63,
            "type": "grayTreeFrog"
        },
        {
            "id": 3168,
            "rarity": 63,
            "type": "treeFrog(3)"
        },
        {
            "id": 3271,
            "rarity": 63,
            "type": "treeFrog(6)"
        },
        {
            "id": 3277,
            "rarity": 63,
            "type": "treeFrog(4)"
        },
        {
            "id": 3287,
            "rarity": 63,
            "type": "treeFrog(8)"
        },
        {
            "id": 3300,
            "rarity": 63,
            "type": "grayTreeFrog"
        },
        {
            "id": 3314,
            "rarity": 63,
            "type": "tomatoFrog"
        },
        {
            "id": 3357,
            "rarity": 63,
            "type": "treeFrog(6)"
        },
        {
            "id": 3365,
            "rarity": 63,
            "type": "treeFrog(7)"
        },
        {
            "id": 3439,
            "rarity": 63,
            "type": "blueTreeFrog"
        },
        {
            "id": 3509,
            "rarity": 63,
            "type": "treeFrog(8)"
        },
        {
            "id": 3539,
            "rarity": 63,
            "type": "treeFrog(6)"
        },
        {
            "id": 3557,
            "rarity": 63,
            "type": "treeFrog(6)"
        },
        {
            "id": 3601,
            "rarity": 63,
            "type": "grayTreeFrog"
        },
        {
            "id": 3648,
            "rarity": 63,
            "type": "tomatoFrog"
        },
        {
            "id": 3650,
            "rarity": 63,
            "type": "treeFrog(3)"
        },
        {
            "id": 3665,
            "rarity": 63,
            "type": "treeFrog(3)"
        },
        {
            "id": 3669,
            "rarity": 63,
            "type": "treeFrog(4)"
        },
        {
            "id": 3706,
            "rarity": 63,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3758,
            "rarity": 63,
            "type": "tomatoFrog"
        },
        {
            "id": 3849,
            "rarity": 63,
            "type": "greenTreeFrog"
        },
        {
            "id": 3886,
            "rarity": 63,
            "type": "greenTreeFrog"
        },
        {
            "id": 3896,
            "rarity": 63,
            "type": "treeFrog(4)"
        },
        {
            "id": 3941,
            "rarity": 63,
            "type": "treeFrog(5)"
        },
        {
            "id": 62,
            "rarity": 62,
            "type": "treeFrog(3)"
        },
        {
            "id": 68,
            "rarity": 62,
            "type": "greenTreeFrog"
        },
        {
            "id": 123,
            "rarity": 62,
            "type": "treeFrog(4)"
        },
        {
            "id": 177,
            "rarity": 62,
            "type": "treeFrog(7)"
        },
        {
            "id": 194,
            "rarity": 62,
            "type": "cyanTreeFrog"
        },
        {
            "id": 247,
            "rarity": 62,
            "type": "treeFrog(8)"
        },
        {
            "id": 278,
            "rarity": 62,
            "type": "treeFrog(6)"
        },
        {
            "id": 280,
            "rarity": 62,
            "type": "grayTreeFrog"
        },
        {
            "id": 291,
            "rarity": 62,
            "type": "blueTreeFrog"
        },
        {
            "id": 293,
            "rarity": 62,
            "type": "treeFrog(7)"
        },
        {
            "id": 299,
            "rarity": 62,
            "type": "treeFrog(6)"
        },
        {
            "id": 307,
            "rarity": 62,
            "type": "brownTreeFrog"
        },
        {
            "id": 551,
            "rarity": 62,
            "type": "treeFrog(4)"
        },
        {
            "id": 622,
            "rarity": 62,
            "type": "treeFrog(8)"
        },
        {
            "id": 666,
            "rarity": 62,
            "type": "treeFrog(6)"
        },
        {
            "id": 697,
            "rarity": 62,
            "type": "treeFrog(5)"
        },
        {
            "id": 722,
            "rarity": 62,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 727,
            "rarity": 62,
            "type": "goldenDartFrog"
        },
        {
            "id": 902,
            "rarity": 62,
            "type": "treeFrog(7)"
        },
        {
            "id": 955,
            "rarity": 62,
            "type": "treeFrog(6)"
        },
        {
            "id": 965,
            "rarity": 62,
            "type": "treeFrog(3)"
        },
        {
            "id": 989,
            "rarity": 62,
            "type": "greenTreeFrog"
        },
        {
            "id": 997,
            "rarity": 62,
            "type": "treeFrog(4)"
        },
        {
            "id": 1038,
            "rarity": 62,
            "type": "treeFrog(7)"
        },
        {
            "id": 1064,
            "rarity": 62,
            "type": "blueTreeFrog"
        },
        {
            "id": 1112,
            "rarity": 62,
            "type": "treeFrog(8)"
        },
        {
            "id": 1220,
            "rarity": 62,
            "type": "treeFrog(3)"
        },
        {
            "id": 1230,
            "rarity": 62,
            "type": "treeFrog(8)"
        },
        {
            "id": 1284,
            "rarity": 62,
            "type": "treeFrog(5)"
        },
        {
            "id": 1305,
            "rarity": 62,
            "type": "treeFrog(4)"
        },
        {
            "id": 1475,
            "rarity": 62,
            "type": "treeFrog(8)"
        },
        {
            "id": 1480,
            "rarity": 62,
            "type": "unknown"
        },
        {
            "id": 1508,
            "rarity": 62,
            "type": "treeFrog(8)"
        },
        {
            "id": 1513,
            "rarity": 62,
            "type": "greenTreeFrog"
        },
        {
            "id": 1537,
            "rarity": 62,
            "type": "treeFrog(7)"
        },
        {
            "id": 1592,
            "rarity": 62,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1613,
            "rarity": 62,
            "type": "treeFrog(8)"
        },
        {
            "id": 1617,
            "rarity": 62,
            "type": "treeFrog(4)"
        },
        {
            "id": 1620,
            "rarity": 62,
            "type": "brownTreeFrog"
        },
        {
            "id": 1635,
            "rarity": 62,
            "type": "treeFrog(8)"
        },
        {
            "id": 1660,
            "rarity": 62,
            "type": "treeFrog(4)"
        },
        {
            "id": 1672,
            "rarity": 62,
            "type": "treeFrog(2)"
        },
        {
            "id": 1682,
            "rarity": 62,
            "type": "tomatoFrog"
        },
        {
            "id": 1688,
            "rarity": 62,
            "type": "treeFrog(6)"
        },
        {
            "id": 1706,
            "rarity": 62,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1795,
            "rarity": 62,
            "type": "goldenDartFrog"
        },
        {
            "id": 1930,
            "rarity": 62,
            "type": "blueTreeFrog"
        },
        {
            "id": 1978,
            "rarity": 62,
            "type": "unknown"
        },
        {
            "id": 2083,
            "rarity": 62,
            "type": "treeFrog(4)"
        },
        {
            "id": 2173,
            "rarity": 62,
            "type": "greenTreeFrog"
        },
        {
            "id": 2178,
            "rarity": 62,
            "type": "unknown"
        },
        {
            "id": 2287,
            "rarity": 62,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2471,
            "rarity": 62,
            "type": "unknown"
        },
        {
            "id": 2533,
            "rarity": 62,
            "type": "goldenDartFrog"
        },
        {
            "id": 2565,
            "rarity": 62,
            "type": "treeFrog(8)"
        },
        {
            "id": 2691,
            "rarity": 62,
            "type": "blueTreeFrog"
        },
        {
            "id": 2753,
            "rarity": 62,
            "type": "treeFrog(5)"
        },
        {
            "id": 2777,
            "rarity": 62,
            "type": "unknown"
        },
        {
            "id": 2788,
            "rarity": 62,
            "type": "blueTreeFrog"
        },
        {
            "id": 2793,
            "rarity": 62,
            "type": "treeFrog(6)"
        },
        {
            "id": 2876,
            "rarity": 62,
            "type": "treeFrog(6)"
        },
        {
            "id": 2968,
            "rarity": 62,
            "type": "unknown"
        },
        {
            "id": 3107,
            "rarity": 62,
            "type": "treeFrog(2)"
        },
        {
            "id": 3124,
            "rarity": 62,
            "type": "treeFrog(8)"
        },
        {
            "id": 3307,
            "rarity": 62,
            "type": "goldenDartFrog"
        },
        {
            "id": 3350,
            "rarity": 62,
            "type": "goldenDartFrog"
        },
        {
            "id": 3371,
            "rarity": 62,
            "type": "treeFrog(8)"
        },
        {
            "id": 3505,
            "rarity": 62,
            "type": "greenTreeFrog"
        },
        {
            "id": 3514,
            "rarity": 62,
            "type": "goldenDartFrog"
        },
        {
            "id": 3515,
            "rarity": 62,
            "type": "treeFrog(3)"
        },
        {
            "id": 3604,
            "rarity": 62,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3644,
            "rarity": 62,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3747,
            "rarity": 62,
            "type": "blueTreeFrog"
        },
        {
            "id": 3808,
            "rarity": 62,
            "type": "treeFrog(5)"
        },
        {
            "id": 3837,
            "rarity": 62,
            "type": "treeFrog(7)"
        },
        {
            "id": 3926,
            "rarity": 62,
            "type": "greenTreeFrog"
        },
        {
            "id": 3939,
            "rarity": 62,
            "type": "treeFrog(3)"
        },
        {
            "id": 3993,
            "rarity": 62,
            "type": "treeFrog(7)"
        },
        {
            "id": 4036,
            "rarity": 62,
            "type": "treeFrog(7)"
        },
        {
            "id": 18,
            "rarity": 61,
            "type": "treeFrog(3)"
        },
        {
            "id": 287,
            "rarity": 61,
            "type": "cyanTreeFrog"
        },
        {
            "id": 447,
            "rarity": 61,
            "type": "treeFrog(5)"
        },
        {
            "id": 484,
            "rarity": 61,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 624,
            "rarity": 61,
            "type": "cyanTreeFrog"
        },
        {
            "id": 654,
            "rarity": 61,
            "type": "treeFrog(5)"
        },
        {
            "id": 710,
            "rarity": 61,
            "type": "treeFrog(2)"
        },
        {
            "id": 747,
            "rarity": 61,
            "type": "treeFrog(4)"
        },
        {
            "id": 856,
            "rarity": 61,
            "type": "treeFrog(8)"
        },
        {
            "id": 867,
            "rarity": 61,
            "type": "treeFrog(8)"
        },
        {
            "id": 893,
            "rarity": 61,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 903,
            "rarity": 61,
            "type": "treeFrog(4)"
        },
        {
            "id": 959,
            "rarity": 61,
            "type": "treeFrog(7)"
        },
        {
            "id": 1180,
            "rarity": 61,
            "type": "treeFrog(6)"
        },
        {
            "id": 1250,
            "rarity": 61,
            "type": "blueTreeFrog"
        },
        {
            "id": 1318,
            "rarity": 61,
            "type": "treeFrog(4)"
        },
        {
            "id": 1397,
            "rarity": 61,
            "type": "treeFrog(4)"
        },
        {
            "id": 1398,
            "rarity": 61,
            "type": "treeFrog(4)"
        },
        {
            "id": 1576,
            "rarity": 61,
            "type": "treeFrog(6)"
        },
        {
            "id": 1792,
            "rarity": 61,
            "type": "goldenDartFrog"
        },
        {
            "id": 1803,
            "rarity": 61,
            "type": "treeFrog(5)"
        },
        {
            "id": 1986,
            "rarity": 61,
            "type": "treeFrog(7)"
        },
        {
            "id": 2065,
            "rarity": 61,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2133,
            "rarity": 61,
            "type": "unknown"
        },
        {
            "id": 2151,
            "rarity": 61,
            "type": "treeFrog(5)"
        },
        {
            "id": 2218,
            "rarity": 61,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2231,
            "rarity": 61,
            "type": "treeFrog(7)"
        },
        {
            "id": 2255,
            "rarity": 61,
            "type": "treeFrog(4)"
        },
        {
            "id": 2388,
            "rarity": 61,
            "type": "treeFrog(6)"
        },
        {
            "id": 2450,
            "rarity": 61,
            "type": "treeFrog(6)"
        },
        {
            "id": 2483,
            "rarity": 61,
            "type": "treeFrog(4)"
        },
        {
            "id": 2568,
            "rarity": 61,
            "type": "treeFrog(7)"
        },
        {
            "id": 2583,
            "rarity": 61,
            "type": "treeFrog(8)"
        },
        {
            "id": 2602,
            "rarity": 61,
            "type": "treeFrog(7)"
        },
        {
            "id": 2620,
            "rarity": 61,
            "type": "treeFrog(6)"
        },
        {
            "id": 2640,
            "rarity": 61,
            "type": "treeFrog(7)"
        },
        {
            "id": 2878,
            "rarity": 61,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 2948,
            "rarity": 61,
            "type": "treeFrog(7)"
        },
        {
            "id": 2979,
            "rarity": 61,
            "type": "treeFrog(2)"
        },
        {
            "id": 3052,
            "rarity": 61,
            "type": "treeFrog(3)"
        },
        {
            "id": 3116,
            "rarity": 61,
            "type": "treeFrog(5)"
        },
        {
            "id": 3152,
            "rarity": 61,
            "type": "treeFrog(4)"
        },
        {
            "id": 3179,
            "rarity": 61,
            "type": "brownTreeFrog"
        },
        {
            "id": 3238,
            "rarity": 61,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3305,
            "rarity": 61,
            "type": "treeFrog(7)"
        },
        {
            "id": 3404,
            "rarity": 61,
            "type": "treeFrog(7)"
        },
        {
            "id": 3492,
            "rarity": 61,
            "type": "greenTreeFrog"
        },
        {
            "id": 3684,
            "rarity": 61,
            "type": "treeFrog(8)"
        },
        {
            "id": 3793,
            "rarity": 61,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3835,
            "rarity": 61,
            "type": "treeFrog(5)"
        },
        {
            "id": 3853,
            "rarity": 61,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3861,
            "rarity": 61,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3892,
            "rarity": 61,
            "type": "brownTreeFrog"
        },
        {
            "id": 3914,
            "rarity": 61,
            "type": "treeFrog(3)"
        },
        {
            "id": 3999,
            "rarity": 61,
            "type": "treeFrog(4)"
        },
        {
            "id": 4031,
            "rarity": 61,
            "type": "treeFrog(6)"
        },
        {
            "id": 27,
            "rarity": 60,
            "type": "treeFrog(7)"
        },
        {
            "id": 166,
            "rarity": 60,
            "type": "treeFrog(3)"
        },
        {
            "id": 232,
            "rarity": 60,
            "type": "treeFrog(4)"
        },
        {
            "id": 262,
            "rarity": 60,
            "type": "treeFrog(5)"
        },
        {
            "id": 331,
            "rarity": 60,
            "type": "treeFrog(3)"
        },
        {
            "id": 432,
            "rarity": 60,
            "type": "treeFrog(5)"
        },
        {
            "id": 658,
            "rarity": 60,
            "type": "cyanTreeFrog"
        },
        {
            "id": 889,
            "rarity": 60,
            "type": "brownTreeFrog"
        },
        {
            "id": 1004,
            "rarity": 60,
            "type": "treeFrog(5)"
        },
        {
            "id": 1036,
            "rarity": 60,
            "type": "treeFrog(3)"
        },
        {
            "id": 1062,
            "rarity": 60,
            "type": "treeFrog(4)"
        },
        {
            "id": 1260,
            "rarity": 60,
            "type": "treeFrog(8)"
        },
        {
            "id": 1297,
            "rarity": 60,
            "type": "treeFrog(5)"
        },
        {
            "id": 1298,
            "rarity": 60,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1423,
            "rarity": 60,
            "type": "brownTreeFrog"
        },
        {
            "id": 1429,
            "rarity": 60,
            "type": "treeFrog(8)"
        },
        {
            "id": 1459,
            "rarity": 60,
            "type": "treeFrog(6)"
        },
        {
            "id": 1570,
            "rarity": 60,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1573,
            "rarity": 60,
            "type": "treeFrog(7)"
        },
        {
            "id": 1575,
            "rarity": 60,
            "type": "treeFrog(4)"
        },
        {
            "id": 1589,
            "rarity": 60,
            "type": "brownTreeFrog"
        },
        {
            "id": 1605,
            "rarity": 60,
            "type": "treeFrog(4)"
        },
        {
            "id": 1608,
            "rarity": 60,
            "type": "treeFrog(5)"
        },
        {
            "id": 1748,
            "rarity": 60,
            "type": "treeFrog(7)"
        },
        {
            "id": 1802,
            "rarity": 60,
            "type": "treeFrog(4)"
        },
        {
            "id": 1805,
            "rarity": 60,
            "type": "treeFrog(8)"
        },
        {
            "id": 1894,
            "rarity": 60,
            "type": "treeFrog(4)"
        },
        {
            "id": 1896,
            "rarity": 60,
            "type": "treeFrog(2)"
        },
        {
            "id": 1937,
            "rarity": 60,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1967,
            "rarity": 60,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2004,
            "rarity": 60,
            "type": "brownTreeFrog"
        },
        {
            "id": 2007,
            "rarity": 60,
            "type": "treeFrog(8)"
        },
        {
            "id": 2032,
            "rarity": 60,
            "type": "treeFrog(7)"
        },
        {
            "id": 2155,
            "rarity": 60,
            "type": "treeFrog(6)"
        },
        {
            "id": 2235,
            "rarity": 60,
            "type": "treeFrog(7)"
        },
        {
            "id": 2282,
            "rarity": 60,
            "type": "treeFrog(4)"
        },
        {
            "id": 2414,
            "rarity": 60,
            "type": "treeFrog(5)"
        },
        {
            "id": 2470,
            "rarity": 60,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2574,
            "rarity": 60,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2783,
            "rarity": 60,
            "type": "treeFrog(5)"
        },
        {
            "id": 2835,
            "rarity": 60,
            "type": "treeFrog(6)"
        },
        {
            "id": 2905,
            "rarity": 60,
            "type": "treeFrog(4)"
        },
        {
            "id": 3002,
            "rarity": 60,
            "type": "treeFrog(7)"
        },
        {
            "id": 3017,
            "rarity": 60,
            "type": "treeFrog(4)"
        },
        {
            "id": 3279,
            "rarity": 60,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3295,
            "rarity": 60,
            "type": "redEyedTreeFrog"
        },
        {
            "id": 3473,
            "rarity": 60,
            "type": "treeFrog(8)"
        },
        {
            "id": 3609,
            "rarity": 60,
            "type": "treeFrog(8)"
        },
        {
            "id": 3615,
            "rarity": 60,
            "type": "treeFrog(8)"
        },
        {
            "id": 3679,
            "rarity": 60,
            "type": "treeFrog(7)"
        },
        {
            "id": 3757,
            "rarity": 60,
            "type": "treeFrog(7)"
        },
        {
            "id": 3851,
            "rarity": 60,
            "type": "treeFrog(4)"
        },
        {
            "id": 3935,
            "rarity": 60,
            "type": "treeFrog(5)"
        },
        {
            "id": 100,
            "rarity": 59,
            "type": "treeFrog(5)"
        },
        {
            "id": 124,
            "rarity": 59,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 162,
            "rarity": 59,
            "type": "treeFrog(7)"
        },
        {
            "id": 270,
            "rarity": 59,
            "type": "treeFrog(6)"
        },
        {
            "id": 330,
            "rarity": 59,
            "type": "treeFrog(8)"
        },
        {
            "id": 350,
            "rarity": 59,
            "type": "treeFrog(4)"
        },
        {
            "id": 397,
            "rarity": 59,
            "type": "treeFrog(4)"
        },
        {
            "id": 405,
            "rarity": 59,
            "type": "treeFrog(7)"
        },
        {
            "id": 450,
            "rarity": 59,
            "type": "treeFrog(8)"
        },
        {
            "id": 568,
            "rarity": 59,
            "type": "treeFrog(6)"
        },
        {
            "id": 861,
            "rarity": 59,
            "type": "cyanTreeFrog"
        },
        {
            "id": 961,
            "rarity": 59,
            "type": "treeFrog(8)"
        },
        {
            "id": 1003,
            "rarity": 59,
            "type": "treeFrog(6)"
        },
        {
            "id": 1045,
            "rarity": 59,
            "type": "treeFrog(5)"
        },
        {
            "id": 1079,
            "rarity": 59,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1181,
            "rarity": 59,
            "type": "treeFrog(4)"
        },
        {
            "id": 1320,
            "rarity": 59,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1721,
            "rarity": 59,
            "type": "brownTreeFrog"
        },
        {
            "id": 1817,
            "rarity": 59,
            "type": "treeFrog(4)"
        },
        {
            "id": 2018,
            "rarity": 59,
            "type": "brownTreeFrog"
        },
        {
            "id": 2048,
            "rarity": 59,
            "type": "treeFrog(4)"
        },
        {
            "id": 2241,
            "rarity": 59,
            "type": "treeFrog(4)"
        },
        {
            "id": 2456,
            "rarity": 59,
            "type": "treeFrog(6)"
        },
        {
            "id": 2548,
            "rarity": 59,
            "type": "treeFrog(6)"
        },
        {
            "id": 2791,
            "rarity": 59,
            "type": "brownTreeFrog"
        },
        {
            "id": 2796,
            "rarity": 59,
            "type": "treeFrog(4)"
        },
        {
            "id": 2820,
            "rarity": 59,
            "type": "treeFrog(6)"
        },
        {
            "id": 2866,
            "rarity": 59,
            "type": "treeFrog(5)"
        },
        {
            "id": 2924,
            "rarity": 59,
            "type": "treeFrog(8)"
        },
        {
            "id": 2947,
            "rarity": 59,
            "type": "treeFrog(6)"
        },
        {
            "id": 2991,
            "rarity": 59,
            "type": "treeFrog(8)"
        },
        {
            "id": 3013,
            "rarity": 59,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3095,
            "rarity": 59,
            "type": "treeFrog(5)"
        },
        {
            "id": 3327,
            "rarity": 59,
            "type": "treeFrog(6)"
        },
        {
            "id": 3328,
            "rarity": 59,
            "type": "treeFrog(7)"
        },
        {
            "id": 3677,
            "rarity": 59,
            "type": "treeFrog(8)"
        },
        {
            "id": 3734,
            "rarity": 59,
            "type": "treeFrog(4)"
        },
        {
            "id": 3750,
            "rarity": 59,
            "type": "treeFrog(5)"
        },
        {
            "id": 3781,
            "rarity": 59,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3797,
            "rarity": 59,
            "type": "treeFrog(8)"
        },
        {
            "id": 3917,
            "rarity": 59,
            "type": "treeFrog(8)"
        },
        {
            "id": 3942,
            "rarity": 59,
            "type": "treeFrog(5)"
        },
        {
            "id": 6,
            "rarity": 58,
            "type": "treeFrog(5)"
        },
        {
            "id": 15,
            "rarity": 58,
            "type": "treeFrog(5)"
        },
        {
            "id": 168,
            "rarity": 58,
            "type": "treeFrog(5)"
        },
        {
            "id": 213,
            "rarity": 58,
            "type": "treeFrog(6)"
        },
        {
            "id": 286,
            "rarity": 58,
            "type": "cyanTreeFrog"
        },
        {
            "id": 335,
            "rarity": 58,
            "type": "treeFrog(8)"
        },
        {
            "id": 340,
            "rarity": 58,
            "type": "treeFrog(5)"
        },
        {
            "id": 419,
            "rarity": 58,
            "type": "cyanTreeFrog"
        },
        {
            "id": 420,
            "rarity": 58,
            "type": "cyanTreeFrog"
        },
        {
            "id": 491,
            "rarity": 58,
            "type": "treeFrog(6)"
        },
        {
            "id": 518,
            "rarity": 58,
            "type": "brownTreeFrog"
        },
        {
            "id": 716,
            "rarity": 58,
            "type": "treeFrog(5)"
        },
        {
            "id": 945,
            "rarity": 58,
            "type": "treeFrog(7)"
        },
        {
            "id": 1011,
            "rarity": 58,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1115,
            "rarity": 58,
            "type": "treeFrog(5)"
        },
        {
            "id": 1246,
            "rarity": 58,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1324,
            "rarity": 58,
            "type": "treeFrog(5)"
        },
        {
            "id": 1514,
            "rarity": 58,
            "type": "treeFrog(5)"
        },
        {
            "id": 1542,
            "rarity": 58,
            "type": "treeFrog(8)"
        },
        {
            "id": 1629,
            "rarity": 58,
            "type": "brownTreeFrog"
        },
        {
            "id": 1695,
            "rarity": 58,
            "type": "treeFrog(3)"
        },
        {
            "id": 1725,
            "rarity": 58,
            "type": "treeFrog(6)"
        },
        {
            "id": 1757,
            "rarity": 58,
            "type": "brownTreeFrog"
        },
        {
            "id": 1775,
            "rarity": 58,
            "type": "treeFrog(3)"
        },
        {
            "id": 1796,
            "rarity": 58,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 1872,
            "rarity": 58,
            "type": "treeFrog(7)"
        },
        {
            "id": 2121,
            "rarity": 58,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2556,
            "rarity": 58,
            "type": "treeFrog(7)"
        },
        {
            "id": 2575,
            "rarity": 58,
            "type": "treeFrog(4)"
        },
        {
            "id": 2576,
            "rarity": 58,
            "type": "treeFrog(5)"
        },
        {
            "id": 2627,
            "rarity": 58,
            "type": "treeFrog(8)"
        },
        {
            "id": 2666,
            "rarity": 58,
            "type": "treeFrog(6)"
        },
        {
            "id": 2675,
            "rarity": 58,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 2726,
            "rarity": 58,
            "type": "treeFrog(7)"
        },
        {
            "id": 2789,
            "rarity": 58,
            "type": "treeFrog(6)"
        },
        {
            "id": 2802,
            "rarity": 58,
            "type": "cyanTreeFrog"
        },
        {
            "id": 2897,
            "rarity": 58,
            "type": "treeFrog(3)"
        },
        {
            "id": 2915,
            "rarity": 58,
            "type": "treeFrog(7)"
        },
        {
            "id": 3050,
            "rarity": 58,
            "type": "treeFrog(8)"
        },
        {
            "id": 3076,
            "rarity": 58,
            "type": "brownTreeFrog"
        },
        {
            "id": 3085,
            "rarity": 58,
            "type": "treeFrog(6)"
        },
        {
            "id": 3103,
            "rarity": 58,
            "type": "treeFrog(5)"
        },
        {
            "id": 3117,
            "rarity": 58,
            "type": "brownTreeFrog"
        },
        {
            "id": 3243,
            "rarity": 58,
            "type": "treeFrog(5)"
        },
        {
            "id": 3369,
            "rarity": 58,
            "type": "cyanTreeFrog"
        },
        {
            "id": 3400,
            "rarity": 58,
            "type": "treeFrog(7)"
        },
        {
            "id": 3426,
            "rarity": 58,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3445,
            "rarity": 58,
            "type": "treeFrog(4)"
        },
        {
            "id": 3467,
            "rarity": 58,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3502,
            "rarity": 58,
            "type": "treeFrog(5)"
        },
        {
            "id": 3678,
            "rarity": 58,
            "type": "treeFrog(7)"
        },
        {
            "id": 3911,
            "rarity": 58,
            "type": "treeFrog(5)"
        },
        {
            "id": 3915,
            "rarity": 58,
            "type": "treeFrog(4)"
        },
        {
            "id": 3919,
            "rarity": 58,
            "type": "brownTreeFrog"
        },
        {
            "id": 325,
            "rarity": 57,
            "type": "treeFrog(7)"
        },
        {
            "id": 346,
            "rarity": 57,
            "type": "treeFrog(5)"
        },
        {
            "id": 352,
            "rarity": 57,
            "type": "treeFrog(6)"
        },
        {
            "id": 465,
            "rarity": 57,
            "type": "treeFrog(7)"
        },
        {
            "id": 495,
            "rarity": 57,
            "type": "brownTreeFrog"
        },
        {
            "id": 517,
            "rarity": 57,
            "type": "treeFrog(8)"
        },
        {
            "id": 737,
            "rarity": 57,
            "type": "treeFrog(5)"
        },
        {
            "id": 812,
            "rarity": 57,
            "type": "treeFrog(6)"
        },
        {
            "id": 1027,
            "rarity": 57,
            "type": "treeFrog(8)"
        },
        {
            "id": 1374,
            "rarity": 57,
            "type": "treeFrog(6)"
        },
        {
            "id": 1519,
            "rarity": 57,
            "type": "treeFrog(7)"
        },
        {
            "id": 1548,
            "rarity": 57,
            "type": "treeFrog(7)"
        },
        {
            "id": 1569,
            "rarity": 57,
            "type": "treeFrog(3)"
        },
        {
            "id": 1609,
            "rarity": 57,
            "type": "cyanTreeFrog"
        },
        {
            "id": 1754,
            "rarity": 57,
            "type": "treeFrog(7)"
        },
        {
            "id": 1810,
            "rarity": 57,
            "type": "treeFrog(8)"
        },
        {
            "id": 1970,
            "rarity": 57,
            "type": "treeFrog(5)"
        },
        {
            "id": 2005,
            "rarity": 57,
            "type": "treeFrog(7)"
        },
        {
            "id": 2029,
            "rarity": 57,
            "type": "treeFrog(8)"
        },
        {
            "id": 2051,
            "rarity": 57,
            "type": "treeFrog(7)"
        },
        {
            "id": 2230,
            "rarity": 57,
            "type": "treeFrog(5)"
        },
        {
            "id": 2354,
            "rarity": 57,
            "type": "treeFrog(6)"
        },
        {
            "id": 2427,
            "rarity": 57,
            "type": "treeFrog(8)"
        },
        {
            "id": 2580,
            "rarity": 57,
            "type": "treeFrog(5)"
        },
        {
            "id": 2662,
            "rarity": 57,
            "type": "treeFrog(6)"
        },
        {
            "id": 2679,
            "rarity": 57,
            "type": "lightBrownTreeFrog"
        },
        {
            "id": 3080,
            "rarity": 57,
            "type": "treeFrog(6)"
        },
        {
            "id": 3083,
            "rarity": 57,
            "type": "treeFrog(8)"
        },
        {
            "id": 3207,
            "rarity": 57,
            "type": "treeFrog(8)"
        },
        {
            "id": 3290,
            "rarity": 57,
            "type": "treeFrog(6)"
        },
        {
            "id": 3340,
            "rarity": 57,
            "type": "treeFrog(8)"
        },
        {
            "id": 3384,
            "rarity": 57,
            "type": "treeFrog(4)"
        },
        {
            "id": 3484,
            "rarity": 57,
            "type": "treeFrog(6)"
        },
        {
            "id": 3485,
            "rarity": 57,
            "type": "treeFrog(8)"
        },
        {
            "id": 3516,
            "rarity": 57,
            "type": "treeFrog(7)"
        },
        {
            "id": 3540,
            "rarity": 57,
            "type": "treeFrog(6)"
        },
        {
            "id": 3783,
            "rarity": 57,
            "type": "treeFrog(5)"
        },
        {
            "id": 3843,
            "rarity": 57,
            "type": "treeFrog(4)"
        },
        {
            "id": 3907,
            "rarity": 57,
            "type": "treeFrog(3)"
        },
        {
            "id": 4021,
            "rarity": 57,
            "type": "treeFrog(8)"
        },
        {
            "id": 4026,
            "rarity": 57,
            "type": "treeFrog(5)"
        },
        {
            "id": 5,
            "rarity": 56,
            "type": "treeFrog(7)"
        },
        {
            "id": 170,
            "rarity": 56,
            "type": "treeFrog(7)"
        },
        {
            "id": 234,
            "rarity": 56,
            "type": "treeFrog(4)"
        },
        {
            "id": 289,
            "rarity": 56,
            "type": "treeFrog(5)"
        },
        {
            "id": 297,
            "rarity": 56,
            "type": "treeFrog(6)"
        },
        {
            "id": 418,
            "rarity": 56,
            "type": "treeFrog(7)"
        },
        {
            "id": 431,
            "rarity": 56,
            "type": "treeFrog(6)"
        },
        {
            "id": 473,
            "rarity": 56,
            "type": "treeFrog(4)"
        },
        {
            "id": 514,
            "rarity": 56,
            "type": "treeFrog(5)"
        },
        {
            "id": 1032,
            "rarity": 56,
            "type": "treeFrog(7)"
        },
        {
            "id": 1056,
            "rarity": 56,
            "type": "treeFrog(3)"
        },
        {
            "id": 1066,
            "rarity": 56,
            "type": "treeFrog(7)"
        },
        {
            "id": 1097,
            "rarity": 56,
            "type": "treeFrog(6)"
        },
        {
            "id": 1209,
            "rarity": 56,
            "type": "treeFrog(7)"
        },
        {
            "id": 1443,
            "rarity": 56,
            "type": "treeFrog(7)"
        },
        {
            "id": 1557,
            "rarity": 56,
            "type": "treeFrog(7)"
        },
        {
            "id": 1723,
            "rarity": 56,
            "type": "treeFrog(8)"
        },
        {
            "id": 1928,
            "rarity": 56,
            "type": "treeFrog(7)"
        },
        {
            "id": 1940,
            "rarity": 56,
            "type": "treeFrog(3)"
        },
        {
            "id": 2120,
            "rarity": 56,
            "type": "treeFrog(6)"
        },
        {
            "id": 2233,
            "rarity": 56,
            "type": "treeFrog(8)"
        },
        {
            "id": 2307,
            "rarity": 56,
            "type": "treeFrog(6)"
        },
        {
            "id": 2373,
            "rarity": 56,
            "type": "treeFrog(6)"
        },
        {
            "id": 2399,
            "rarity": 56,
            "type": "treeFrog(8)"
        },
        {
            "id": 2426,
            "rarity": 56,
            "type": "treeFrog(7)"
        },
        {
            "id": 2709,
            "rarity": 56,
            "type": "treeFrog(8)"
        },
        {
            "id": 2874,
            "rarity": 56,
            "type": "treeFrog(8)"
        },
        {
            "id": 2887,
            "rarity": 56,
            "type": "treeFrog(6)"
        },
        {
            "id": 3146,
            "rarity": 56,
            "type": "treeFrog(3)"
        },
        {
            "id": 3171,
            "rarity": 56,
            "type": "treeFrog(6)"
        },
        {
            "id": 3294,
            "rarity": 56,
            "type": "treeFrog(7)"
        },
        {
            "id": 3474,
            "rarity": 56,
            "type": "treeFrog(6)"
        },
        {
            "id": 3574,
            "rarity": 56,
            "type": "treeFrog(8)"
        },
        {
            "id": 3655,
            "rarity": 56,
            "type": "treeFrog(5)"
        },
        {
            "id": 3668,
            "rarity": 56,
            "type": "treeFrog(6)"
        },
        {
            "id": 3711,
            "rarity": 56,
            "type": "treeFrog(5)"
        },
        {
            "id": 3713,
            "rarity": 56,
            "type": "treeFrog(6)"
        },
        {
            "id": 3752,
            "rarity": 56,
            "type": "treeFrog(6)"
        },
        {
            "id": 3765,
            "rarity": 56,
            "type": "treeFrog(3)"
        },
        {
            "id": 3778,
            "rarity": 56,
            "type": "treeFrog(5)"
        },
        {
            "id": 3953,
            "rarity": 56,
            "type": "treeFrog(8)"
        },
        {
            "id": 3963,
            "rarity": 56,
            "type": "treeFrog(7)"
        },
        {
            "id": 26,
            "rarity": 55,
            "type": "treeFrog(7)"
        },
        {
            "id": 127,
            "rarity": 55,
            "type": "treeFrog(6)"
        },
        {
            "id": 632,
            "rarity": 55,
            "type": "treeFrog(7)"
        },
        {
            "id": 741,
            "rarity": 55,
            "type": "treeFrog(5)"
        },
        {
            "id": 835,
            "rarity": 55,
            "type": "treeFrog(5)"
        },
        {
            "id": 836,
            "rarity": 55,
            "type": "treeFrog(7)"
        },
        {
            "id": 984,
            "rarity": 55,
            "type": "treeFrog(4)"
        },
        {
            "id": 1107,
            "rarity": 55,
            "type": "treeFrog(6)"
        },
        {
            "id": 1144,
            "rarity": 55,
            "type": "treeFrog(6)"
        },
        {
            "id": 1192,
            "rarity": 55,
            "type": "treeFrog(6)"
        },
        {
            "id": 1217,
            "rarity": 55,
            "type": "treeFrog(8)"
        },
        {
            "id": 1285,
            "rarity": 55,
            "type": "treeFrog(7)"
        },
        {
            "id": 1306,
            "rarity": 55,
            "type": "treeFrog(7)"
        },
        {
            "id": 1402,
            "rarity": 55,
            "type": "treeFrog(6)"
        },
        {
            "id": 1414,
            "rarity": 55,
            "type": "treeFrog(8)"
        },
        {
            "id": 1431,
            "rarity": 55,
            "type": "treeFrog(7)"
        },
        {
            "id": 1579,
            "rarity": 55,
            "type": "treeFrog(6)"
        },
        {
            "id": 1779,
            "rarity": 55,
            "type": "treeFrog(7)"
        },
        {
            "id": 1782,
            "rarity": 55,
            "type": "treeFrog(6)"
        },
        {
            "id": 1901,
            "rarity": 55,
            "type": "treeFrog(7)"
        },
        {
            "id": 1946,
            "rarity": 55,
            "type": "treeFrog(8)"
        },
        {
            "id": 2128,
            "rarity": 55,
            "type": "treeFrog(7)"
        },
        {
            "id": 2134,
            "rarity": 55,
            "type": "treeFrog(6)"
        },
        {
            "id": 2141,
            "rarity": 55,
            "type": "treeFrog(6)"
        },
        {
            "id": 2294,
            "rarity": 55,
            "type": "treeFrog(7)"
        },
        {
            "id": 2352,
            "rarity": 55,
            "type": "treeFrog(8)"
        },
        {
            "id": 2412,
            "rarity": 55,
            "type": "treeFrog(6)"
        },
        {
            "id": 2432,
            "rarity": 55,
            "type": "treeFrog(8)"
        },
        {
            "id": 2592,
            "rarity": 55,
            "type": "treeFrog(8)"
        },
        {
            "id": 2656,
            "rarity": 55,
            "type": "treeFrog(4)"
        },
        {
            "id": 2809,
            "rarity": 55,
            "type": "treeFrog(4)"
        },
        {
            "id": 3035,
            "rarity": 55,
            "type": "treeFrog(7)"
        },
        {
            "id": 3133,
            "rarity": 55,
            "type": "treeFrog(6)"
        },
        {
            "id": 3184,
            "rarity": 55,
            "type": "treeFrog(7)"
        },
        {
            "id": 3347,
            "rarity": 55,
            "type": "treeFrog(8)"
        },
        {
            "id": 3360,
            "rarity": 55,
            "type": "treeFrog(6)"
        },
        {
            "id": 3522,
            "rarity": 55,
            "type": "treeFrog(8)"
        },
        {
            "id": 3672,
            "rarity": 55,
            "type": "treeFrog(6)"
        },
        {
            "id": 3775,
            "rarity": 55,
            "type": "treeFrog(6)"
        },
        {
            "id": 3965,
            "rarity": 55,
            "type": "treeFrog(8)"
        },
        {
            "id": 3,
            "rarity": 54,
            "type": "treeFrog(6)"
        },
        {
            "id": 55,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 144,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 176,
            "rarity": 54,
            "type": "treeFrog(8)"
        },
        {
            "id": 226,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 253,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 614,
            "rarity": 54,
            "type": "treeFrog(6)"
        },
        {
            "id": 639,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 760,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 792,
            "rarity": 54,
            "type": "treeFrog(8)"
        },
        {
            "id": 814,
            "rarity": 54,
            "type": "treeFrog(5)"
        },
        {
            "id": 932,
            "rarity": 54,
            "type": "treeFrog(8)"
        },
        {
            "id": 1023,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 1095,
            "rarity": 54,
            "type": "treeFrog(8)"
        },
        {
            "id": 1174,
            "rarity": 54,
            "type": "treeFrog(5)"
        },
        {
            "id": 1448,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 1467,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 1502,
            "rarity": 54,
            "type": "treeFrog(6)"
        },
        {
            "id": 1585,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 1610,
            "rarity": 54,
            "type": "treeFrog(8)"
        },
        {
            "id": 1639,
            "rarity": 54,
            "type": "treeFrog(6)"
        },
        {
            "id": 1647,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 1819,
            "rarity": 54,
            "type": "treeFrog(8)"
        },
        {
            "id": 1897,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 2170,
            "rarity": 54,
            "type": "treeFrog(6)"
        },
        {
            "id": 2226,
            "rarity": 54,
            "type": "treeFrog(8)"
        },
        {
            "id": 2359,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 2503,
            "rarity": 54,
            "type": "treeFrog(6)"
        },
        {
            "id": 2526,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 2557,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 2681,
            "rarity": 54,
            "type": "treeFrog(6)"
        },
        {
            "id": 2857,
            "rarity": 54,
            "type": "treeFrog(6)"
        },
        {
            "id": 2859,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 2868,
            "rarity": 54,
            "type": "treeFrog(8)"
        },
        {
            "id": 3096,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 3282,
            "rarity": 54,
            "type": "treeFrog(8)"
        },
        {
            "id": 3285,
            "rarity": 54,
            "type": "treeFrog(6)"
        },
        {
            "id": 3450,
            "rarity": 54,
            "type": "treeFrog(6)"
        },
        {
            "id": 3454,
            "rarity": 54,
            "type": "treeFrog(7)"
        },
        {
            "id": 3548,
            "rarity": 54,
            "type": "treeFrog(6)"
        },
        {
            "id": 3790,
            "rarity": 54,
            "type": "treeFrog(8)"
        },
        {
            "id": 4028,
            "rarity": 54,
            "type": "treeFrog(4)"
        },
        {
            "id": 59,
            "rarity": 53,
            "type": "treeFrog(6)"
        },
        {
            "id": 265,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 571,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 832,
            "rarity": 53,
            "type": "treeFrog(7)"
        },
        {
            "id": 1042,
            "rarity": 53,
            "type": "treeFrog(6)"
        },
        {
            "id": 1244,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 1258,
            "rarity": 53,
            "type": "treeFrog(4)"
        },
        {
            "id": 1273,
            "rarity": 53,
            "type": "treeFrog(4)"
        },
        {
            "id": 1308,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 1341,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 1373,
            "rarity": 53,
            "type": "treeFrog(6)"
        },
        {
            "id": 1385,
            "rarity": 53,
            "type": "treeFrog(4)"
        },
        {
            "id": 1887,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 1944,
            "rarity": 53,
            "type": "treeFrog(7)"
        },
        {
            "id": 1979,
            "rarity": 53,
            "type": "treeFrog(5)"
        },
        {
            "id": 2112,
            "rarity": 53,
            "type": "treeFrog(7)"
        },
        {
            "id": 2346,
            "rarity": 53,
            "type": "treeFrog(7)"
        },
        {
            "id": 2520,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 2672,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 2758,
            "rarity": 53,
            "type": "treeFrog(7)"
        },
        {
            "id": 2761,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 2945,
            "rarity": 53,
            "type": "treeFrog(7)"
        },
        {
            "id": 3119,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 3122,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 3319,
            "rarity": 53,
            "type": "treeFrog(6)"
        },
        {
            "id": 3353,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 3392,
            "rarity": 53,
            "type": "treeFrog(4)"
        },
        {
            "id": 3598,
            "rarity": 53,
            "type": "treeFrog(7)"
        },
        {
            "id": 3693,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 3701,
            "rarity": 53,
            "type": "treeFrog(6)"
        },
        {
            "id": 3735,
            "rarity": 53,
            "type": "treeFrog(5)"
        },
        {
            "id": 3739,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 3759,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 3773,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 3776,
            "rarity": 53,
            "type": "treeFrog(6)"
        },
        {
            "id": 3806,
            "rarity": 53,
            "type": "treeFrog(4)"
        },
        {
            "id": 3881,
            "rarity": 53,
            "type": "treeFrog(5)"
        },
        {
            "id": 3924,
            "rarity": 53,
            "type": "treeFrog(8)"
        },
        {
            "id": 3987,
            "rarity": 53,
            "type": "treeFrog(4)"
        },
        {
            "id": 351,
            "rarity": 52,
            "type": "treeFrog(8)"
        },
        {
            "id": 353,
            "rarity": 52,
            "type": "treeFrog(6)"
        },
        {
            "id": 706,
            "rarity": 52,
            "type": "treeFrog(5)"
        },
        {
            "id": 730,
            "rarity": 52,
            "type": "treeFrog(8)"
        },
        {
            "id": 1078,
            "rarity": 52,
            "type": "treeFrog(7)"
        },
        {
            "id": 1266,
            "rarity": 52,
            "type": "treeFrog(8)"
        },
        {
            "id": 1347,
            "rarity": 52,
            "type": "treeFrog(8)"
        },
        {
            "id": 1399,
            "rarity": 52,
            "type": "treeFrog(7)"
        },
        {
            "id": 1403,
            "rarity": 52,
            "type": "treeFrog(6)"
        },
        {
            "id": 1495,
            "rarity": 52,
            "type": "treeFrog(7)"
        },
        {
            "id": 1546,
            "rarity": 52,
            "type": "treeFrog(4)"
        },
        {
            "id": 1598,
            "rarity": 52,
            "type": "treeFrog(7)"
        },
        {
            "id": 2224,
            "rarity": 52,
            "type": "treeFrog(7)"
        },
        {
            "id": 2341,
            "rarity": 52,
            "type": "treeFrog(5)"
        },
        {
            "id": 2419,
            "rarity": 52,
            "type": "treeFrog(8)"
        },
        {
            "id": 2479,
            "rarity": 52,
            "type": "treeFrog(7)"
        },
        {
            "id": 3006,
            "rarity": 52,
            "type": "treeFrog(8)"
        },
        {
            "id": 3008,
            "rarity": 52,
            "type": "treeFrog(5)"
        },
        {
            "id": 3573,
            "rarity": 52,
            "type": "treeFrog(7)"
        },
        {
            "id": 3828,
            "rarity": 52,
            "type": "treeFrog(8)"
        },
        {
            "id": 3920,
            "rarity": 52,
            "type": "treeFrog(8)"
        },
        {
            "id": 3962,
            "rarity": 52,
            "type": "treeFrog(8)"
        },
        {
            "id": 3967,
            "rarity": 52,
            "type": "treeFrog(8)"
        },
        {
            "id": 134,
            "rarity": 51,
            "type": "treeFrog(6)"
        },
        {
            "id": 237,
            "rarity": 51,
            "type": "treeFrog(8)"
        },
        {
            "id": 254,
            "rarity": 51,
            "type": "treeFrog(8)"
        },
        {
            "id": 559,
            "rarity": 51,
            "type": "treeFrog(6)"
        },
        {
            "id": 734,
            "rarity": 51,
            "type": "treeFrog(8)"
        },
        {
            "id": 834,
            "rarity": 51,
            "type": "treeFrog(5)"
        },
        {
            "id": 900,
            "rarity": 51,
            "type": "treeFrog(8)"
        },
        {
            "id": 1279,
            "rarity": 51,
            "type": "treeFrog(8)"
        },
        {
            "id": 1412,
            "rarity": 51,
            "type": "treeFrog(8)"
        },
        {
            "id": 1534,
            "rarity": 51,
            "type": "treeFrog(7)"
        },
        {
            "id": 1594,
            "rarity": 51,
            "type": "treeFrog(5)"
        },
        {
            "id": 1918,
            "rarity": 51,
            "type": "treeFrog(7)"
        },
        {
            "id": 2324,
            "rarity": 51,
            "type": "treeFrog(7)"
        },
        {
            "id": 2569,
            "rarity": 51,
            "type": "treeFrog(5)"
        },
        {
            "id": 2916,
            "rarity": 51,
            "type": "treeFrog(6)"
        },
        {
            "id": 3589,
            "rarity": 51,
            "type": "treeFrog(8)"
        },
        {
            "id": 3770,
            "rarity": 51,
            "type": "treeFrog(5)"
        },
        {
            "id": 366,
            "rarity": 50,
            "type": "treeFrog(8)"
        },
        {
            "id": 522,
            "rarity": 50,
            "type": "treeFrog(5)"
        },
        {
            "id": 556,
            "rarity": 50,
            "type": "treeFrog(6)"
        },
        {
            "id": 1125,
            "rarity": 50,
            "type": "treeFrog(6)"
        },
        {
            "id": 1268,
            "rarity": 50,
            "type": "treeFrog(7)"
        },
        {
            "id": 1698,
            "rarity": 50,
            "type": "treeFrog(8)"
        },
        {
            "id": 2862,
            "rarity": 50,
            "type": "treeFrog(8)"
        },
        {
            "id": 3420,
            "rarity": 50,
            "type": "treeFrog(7)"
        },
        {
            "id": 3946,
            "rarity": 50,
            "type": "treeFrog(6)"
        },
        {
            "id": 70,
            "rarity": 49,
            "type": "treeFrog(7)"
        },
        {
            "id": 435,
            "rarity": 49,
            "type": "treeFrog(8)"
        },
        {
            "id": 675,
            "rarity": 49,
            "type": "treeFrog(6)"
        },
        {
            "id": 1726,
            "rarity": 49,
            "type": "treeFrog(6)"
        },
        {
            "id": 2285,
            "rarity": 49,
            "type": "treeFrog(8)"
        },
        {
            "id": 2443,
            "rarity": 49,
            "type": "treeFrog(6)"
        },
        {
            "id": 2653,
            "rarity": 49,
            "type": "treeFrog(7)"
        },
        {
            "id": 3003,
            "rarity": 49,
            "type": "treeFrog(7)"
        },
        {
            "id": 3624,
            "rarity": 49,
            "type": "treeFrog(8)"
        },
        {
            "id": 739,
            "rarity": 48,
            "type": "treeFrog(7)"
        },
        {
            "id": 848,
            "rarity": 48,
            "type": "treeFrog(6)"
        },
        {
            "id": 1224,
            "rarity": 48,
            "type": "treeFrog(6)"
        },
        {
            "id": 1560,
            "rarity": 48,
            "type": "treeFrog(7)"
        },
        {
            "id": 2360,
            "rarity": 48,
            "type": "treeFrog(6)"
        },
        {
            "id": 2952,
            "rarity": 48,
            "type": "treeFrog(8)"
        },
        {
            "id": 2971,
            "rarity": 48,
            "type": "treeFrog(6)"
        },
        {
            "id": 3112,
            "rarity": 48,
            "type": "treeFrog(6)"
        },
        {
            "id": 3216,
            "rarity": 48,
            "type": "treeFrog(8)"
        },
        {
            "id": 3249,
            "rarity": 48,
            "type": "treeFrog(7)"
        },
        {
            "id": 3257,
            "rarity": 48,
            "type": "treeFrog(8)"
        },
        {
            "id": 3458,
            "rarity": 48,
            "type": "treeFrog(2)"
        },
        {
            "id": 3654,
            "rarity": 48,
            "type": "treeFrog(8)"
        },
        {
            "id": 3822,
            "rarity": 48,
            "type": "treeFrog(2)"
        },
        {
            "id": 3954,
            "rarity": 48,
            "type": "treeFrog(6)"
        },
        {
            "id": 4,
            "rarity": 47,
            "type": "treeFrog(2)"
        },
        {
            "id": 79,
            "rarity": 47,
            "type": "treeFrog(2)"
        },
        {
            "id": 1257,
            "rarity": 47,
            "type": "treeFrog(7)"
        },
        {
            "id": 1325,
            "rarity": 47,
            "type": "treeFrog(7)"
        },
        {
            "id": 1446,
            "rarity": 47,
            "type": "treeFrog(7)"
        },
        {
            "id": 1611,
            "rarity": 47,
            "type": "treeFrog(7)"
        },
        {
            "id": 1638,
            "rarity": 47,
            "type": "treeFrog(8)"
        },
        {
            "id": 1788,
            "rarity": 47,
            "type": "treeFrog(6)"
        },
        {
            "id": 1856,
            "rarity": 47,
            "type": "treeFrog(7)"
        },
        {
            "id": 2003,
            "rarity": 47,
            "type": "treeFrog(8)"
        },
        {
            "id": 3984,
            "rarity": 47,
            "type": "treeFrog(8)"
        },
        {
            "id": 4029,
            "rarity": 47,
            "type": "treeFrog(2)"
        },
        {
            "id": 156,
            "rarity": 46,
            "type": "treeFrog(8)"
        },
        {
            "id": 294,
            "rarity": 46,
            "type": "treeFrog(8)"
        },
        {
            "id": 446,
            "rarity": 46,
            "type": "treeFrog(2)"
        },
        {
            "id": 1943,
            "rarity": 46,
            "type": "treeFrog(2)"
        },
        {
            "id": 2115,
            "rarity": 46,
            "type": "treeFrog(8)"
        },
        {
            "id": 2229,
            "rarity": 46,
            "type": "treeFrog(7)"
        },
        {
            "id": 2448,
            "rarity": 46,
            "type": "treeFrog(2)"
        },
        {
            "id": 2737,
            "rarity": 46,
            "type": "treeFrog(8)"
        },
        {
            "id": 2933,
            "rarity": 46,
            "type": "treeFrog(8)"
        },
        {
            "id": 3741,
            "rarity": 46,
            "type": "treeFrog(2)"
        },
        {
            "id": 587,
            "rarity": 45,
            "type": "treeFrog(2)"
        },
        {
            "id": 855,
            "rarity": 45,
            "type": "treeFrog(2)"
        },
        {
            "id": 2654,
            "rarity": 45,
            "type": "treeFrog(8)"
        },
        {
            "id": 3697,
            "rarity": 45,
            "type": "treeFrog(2)"
        },
        {
            "id": 607,
            "rarity": 44,
            "type": "treeFrog(2)"
        },
        {
            "id": 938,
            "rarity": 44,
            "type": "treeFrog(2)"
        },
        {
            "id": 1710,
            "rarity": 44,
            "type": "treeFrog(2)"
        },
        {
            "id": 2389,
            "rarity": 44,
            "type": "treeFrog(2)"
        },
        {
            "id": 2499,
            "rarity": 44,
            "type": "treeFrog(2)"
        },
        {
            "id": 3270,
            "rarity": 44,
            "type": "treeFrog(2)"
        },
        {
            "id": 1200,
            "rarity": 43,
            "type": "treeFrog(2)"
        },
        {
            "id": 1618,
            "rarity": 43,
            "type": "treeFrog(3)"
        },
        {
            "id": 2349,
            "rarity": 43,
            "type": "treeFrog(3)"
        },
        {
            "id": 2493,
            "rarity": 42,
            "type": "treeFrog(3)"
        },
        {
            "id": 3024,
            "rarity": 42,
            "type": "treeFrog(3)"
        },
        {
            "id": 3210,
            "rarity": 42,
            "type": "treeFrog(3)"
        },
        {
            "id": 358,
            "rarity": 41,
            "type": "treeFrog(3)"
        },
        {
            "id": 1171,
            "rarity": 41,
            "type": "treeFrog(3)"
        },
        {
            "id": 1406,
            "rarity": 41,
            "type": "treeFrog(3)"
        },
        {
            "id": 3316,
            "rarity": 41,
            "type": "treeFrog(3)"
        },
        {
            "id": 46,
            "rarity": 40,
            "type": "treeFrog(4)"
        },
        {
            "id": 1545,
            "rarity": 40,
            "type": "treeFrog(4)"
        },
        {
            "id": 2357,
            "rarity": 40,
            "type": "treeFrog(3)"
        },
        {
            "id": 2500,
            "rarity": 40,
            "type": "treeFrog(3)"
        },
        {
            "id": 2936,
            "rarity": 40,
            "type": "treeFrog(3)"
        },
        {
            "id": 757,
            "rarity": 39,
            "type": "treeFrog(4)"
        },
        {
            "id": 947,
            "rarity": 39,
            "type": "treeFrog(3)"
        },
        {
            "id": 1054,
            "rarity": 39,
            "type": "treeFrog(4)"
        },
        {
            "id": 1190,
            "rarity": 39,
            "type": "treeFrog(3)"
        },
        {
            "id": 2072,
            "rarity": 39,
            "type": "treeFrog(3)"
        },
        {
            "id": 2912,
            "rarity": 39,
            "type": "treeFrog(4)"
        },
        {
            "id": 3217,
            "rarity": 39,
            "type": "treeFrog(3)"
        },
        {
            "id": 3848,
            "rarity": 39,
            "type": "treeFrog(3)"
        },
        {
            "id": 3871,
            "rarity": 39,
            "type": "treeFrog(3)"
        },
        {
            "id": 130,
            "rarity": 38,
            "type": "treeFrog(4)"
        },
        {
            "id": 613,
            "rarity": 38,
            "type": "treeFrog(5)"
        },
        {
            "id": 1983,
            "rarity": 38,
            "type": "treeFrog(4)"
        },
        {
            "id": 2658,
            "rarity": 38,
            "type": "treeFrog(5)"
        },
        {
            "id": 2696,
            "rarity": 38,
            "type": "treeFrog(3)"
        },
        {
            "id": 3523,
            "rarity": 38,
            "type": "treeFrog(4)"
        },
        {
            "id": 3656,
            "rarity": 38,
            "type": "treeFrog(4)"
        },
        {
            "id": 382,
            "rarity": 37,
            "type": "treeFrog(4)"
        },
        {
            "id": 1764,
            "rarity": 37,
            "type": "treeFrog(5)"
        },
        {
            "id": 1783,
            "rarity": 37,
            "type": "treeFrog(4)"
        },
        {
            "id": 2808,
            "rarity": 37,
            "type": "treeFrog(4)"
        },
        {
            "id": 2928,
            "rarity": 37,
            "type": "treeFrog(5)"
        },
        {
            "id": 3587,
            "rarity": 37,
            "type": "treeFrog(5)"
        },
        {
            "id": 41,
            "rarity": 36,
            "type": "treeFrog(4)"
        },
        {
            "id": 393,
            "rarity": 36,
            "type": "treeFrog(4)"
        },
        {
            "id": 1002,
            "rarity": 36,
            "type": "treeFrog(4)"
        },
        {
            "id": 1267,
            "rarity": 36,
            "type": "treeFrog(5)"
        },
        {
            "id": 1772,
            "rarity": 36,
            "type": "treeFrog(5)"
        },
        {
            "id": 1822,
            "rarity": 36,
            "type": "treeFrog(4)"
        },
        {
            "id": 2025,
            "rarity": 36,
            "type": "treeFrog(4)"
        },
        {
            "id": 2207,
            "rarity": 36,
            "type": "treeFrog(5)"
        },
        {
            "id": 3403,
            "rarity": 36,
            "type": "treeFrog(5)"
        },
        {
            "id": 3719,
            "rarity": 36,
            "type": "treeFrog(4)"
        },
        {
            "id": 764,
            "rarity": 35,
            "type": "treeFrog(6)"
        },
        {
            "id": 1029,
            "rarity": 35,
            "type": "treeFrog(5)"
        },
        {
            "id": 1178,
            "rarity": 35,
            "type": "treeFrog(6)"
        },
        {
            "id": 1408,
            "rarity": 35,
            "type": "treeFrog(5)"
        },
        {
            "id": 2078,
            "rarity": 35,
            "type": "treeFrog(5)"
        },
        {
            "id": 2591,
            "rarity": 35,
            "type": "treeFrog(4)"
        },
        {
            "id": 471,
            "rarity": 34,
            "type": "treeFrog(5)"
        },
        {
            "id": 520,
            "rarity": 34,
            "type": "treeFrog(5)"
        },
        {
            "id": 617,
            "rarity": 34,
            "type": "treeFrog(7)"
        },
        {
            "id": 641,
            "rarity": 34,
            "type": "treeFrog(5)"
        },
        {
            "id": 825,
            "rarity": 34,
            "type": "treeFrog(5)"
        },
        {
            "id": 1117,
            "rarity": 34,
            "type": "treeFrog(6)"
        },
        {
            "id": 1221,
            "rarity": 34,
            "type": "treeFrog(7)"
        },
        {
            "id": 1593,
            "rarity": 34,
            "type": "treeFrog(6)"
        },
        {
            "id": 2296,
            "rarity": 34,
            "type": "treeFrog(5)"
        },
        {
            "id": 2336,
            "rarity": 34,
            "type": "treeFrog(5)"
        },
        {
            "id": 3692,
            "rarity": 34,
            "type": "treeFrog(6)"
        },
        {
            "id": 574,
            "rarity": 33,
            "type": "treeFrog(7)"
        },
        {
            "id": 634,
            "rarity": 33,
            "type": "treeFrog(7)"
        },
        {
            "id": 788,
            "rarity": 33,
            "type": "treeFrog(7)"
        },
        {
            "id": 809,
            "rarity": 33,
            "type": "treeFrog(6)"
        },
        {
            "id": 1015,
            "rarity": 33,
            "type": "treeFrog(5)"
        },
        {
            "id": 1254,
            "rarity": 33,
            "type": "treeFrog(8)"
        },
        {
            "id": 2462,
            "rarity": 33,
            "type": "treeFrog(6)"
        },
        {
            "id": 2613,
            "rarity": 33,
            "type": "treeFrog(6)"
        },
        {
            "id": 2770,
            "rarity": 33,
            "type": "treeFrog(6)"
        },
        {
            "id": 3092,
            "rarity": 33,
            "type": "treeFrog(8)"
        },
        {
            "id": 25,
            "rarity": 32,
            "type": "treeFrog(7)"
        },
        {
            "id": 279,
            "rarity": 32,
            "type": "treeFrog(8)"
        },
        {
            "id": 808,
            "rarity": 32,
            "type": "treeFrog(7)"
        },
        {
            "id": 2070,
            "rarity": 32,
            "type": "treeFrog(8)"
        },
        {
            "id": 2209,
            "rarity": 32,
            "type": "treeFrog(7)"
        },
        {
            "id": 2302,
            "rarity": 32,
            "type": "treeFrog(6)"
        },
        {
            "id": 2306,
            "rarity": 32,
            "type": "treeFrog(8)"
        },
        {
            "id": 2345,
            "rarity": 32,
            "type": "treeFrog(6)"
        },
        {
            "id": 2614,
            "rarity": 32,
            "type": "treeFrog(7)"
        },
        {
            "id": 3490,
            "rarity": 32,
            "type": "treeFrog(6)"
        },
        {
            "id": 324,
            "rarity": 31,
            "type": "treeFrog(8)"
        },
        {
            "id": 990,
            "rarity": 31,
            "type": "treeFrog(8)"
        },
        {
            "id": 1149,
            "rarity": 31,
            "type": "treeFrog(8)"
        },
        {
            "id": 1350,
            "rarity": 31,
            "type": "treeFrog(8)"
        },
        {
            "id": 2137,
            "rarity": 31,
            "type": "treeFrog(7)"
        },
        {
            "id": 2693,
            "rarity": 31,
            "type": "treeFrog(6)"
        },
        {
            "id": 2716,
            "rarity": 31,
            "type": "treeFrog(6)"
        },
        {
            "id": 3063,
            "rarity": 31,
            "type": "treeFrog(7)"
        },
        {
            "id": 3138,
            "rarity": 31,
            "type": "treeFrog(6)"
        },
        {
            "id": 3162,
            "rarity": 31,
            "type": "treeFrog(7)"
        },
        {
            "id": 3814,
            "rarity": 31,
            "type": "treeFrog(6)"
        },
        {
            "id": 3882,
            "rarity": 31,
            "type": "treeFrog(6)"
        },
        {
            "id": 3973,
            "rarity": 31,
            "type": "treeFrog(6)"
        },
        {
            "id": 504,
            "rarity": 30,
            "type": "treeFrog(7)"
        },
        {
            "id": 1184,
            "rarity": 30,
            "type": "treeFrog(7)"
        },
        {
            "id": 1474,
            "rarity": 30,
            "type": "treeFrog(7)"
        },
        {
            "id": 2091,
            "rarity": 30,
            "type": "treeFrog(8)"
        },
        {
            "id": 2747,
            "rarity": 30,
            "type": "treeFrog(7)"
        },
        {
            "id": 2806,
            "rarity": 30,
            "type": "treeFrog(7)"
        },
        {
            "id": 2951,
            "rarity": 30,
            "type": "treeFrog(8)"
        },
        {
            "id": 3230,
            "rarity": 30,
            "type": "treeFrog(6)"
        },
        {
            "id": 3367,
            "rarity": 30,
            "type": "treeFrog(7)"
        },
        {
            "id": 3785,
            "rarity": 30,
            "type": "treeFrog(8)"
        },
        {
            "id": 933,
            "rarity": 29,
            "type": "treeFrog(8)"
        },
        {
            "id": 1452,
            "rarity": 29,
            "type": "treeFrog(8)"
        },
        {
            "id": 2433,
            "rarity": 29,
            "type": "treeFrog(8)"
        },
        {
            "id": 2797,
            "rarity": 29,
            "type": "treeFrog(8)"
        },
        {
            "id": 3108,
            "rarity": 29,
            "type": "treeFrog(7)"
        },
        {
            "id": 3506,
            "rarity": 29,
            "type": "treeFrog(8)"
        },
        {
            "id": 3637,
            "rarity": 29,
            "type": "treeFrog(8)"
        },
        {
            "id": 1728,
            "rarity": 28,
            "type": "treeFrog(8)"
        },
        null
    ]
    