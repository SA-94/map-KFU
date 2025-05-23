// paths.abs.js — مولَّد آلياً من process-paths-rel.js
const pathsMap = {
  "1181": [
    { x: 253.9919, y: 898.4872, type: "start" },
    { x: 253.0909, y: 878.1344, type: "middle" },
    { x: 214.6182, y: 877.1464, type: "middle" },
    { x: 176.1455, y: 876.1584, type: "end" }
  ],
  "1182": [
    { x: 254.7127, y: 894.0412, type: "start" },
    { x: 254.5325, y: 875.7632, type: "middle" },
    { x: 202.2745, y: 874.874, type: "end" }
  ],
  "1183": [
    { x: 253.7216, y: 894.5352, type: "start" },
    { x: 253.9018, y: 875.2692, type: "middle" },
    { x: 202.5448, y: 874.6764, type: "end" }
  ],
  "1184": [
    { x: 202.5448, y: 872.7992, type: "end" },
    { x: 247.8651, y: 872.2064, type: "middle" },
    { x: 247.8651, y: 895.8196, type: "start" }
  ],
  "1185": [
    { x: 248.4958, y: 897.9932, type: "start" },
    { x: 247.8651, y: 876.2572, type: "middle" },
    { x: 200.1121, y: 874.38, type: "end" }
  ],
  "المسجد": [
    { x: 253.7216, y: 892.4604, type: "start" },
    { x: 253.2711, y: 876.85, type: "middle" },
    { x: 223.6282, y: 876.85, type: "middle" },
    { x: 196.418, y: 876.85, type: "middle" },
    { x: 154.1611, y: 876.2572, type: "middle" },
    { x: 117.2201, y: 876.2572, type: "middle" },
    { x: 117.2201, y: 833.872, type: "middle" },
    { x: 117.8508, y: 787.93, type: "middle" },
    { x: 117.3102, y: 746.0388, type: "end" }
  ],
  "دورة المياء": [
    { x: 251.7394, y: 893.4484, type: "start" },
    { x: 253.181, y: 876.1584, type: "middle" },
    { x: 300.934, y: 876.1584, type: "end" }
  ],
  "1052": [
    { x: 248.2255, y: 902.8344, type: "start" },
    { x: 248.2255, y: 876.85, type: "middle" },
    { x: 208.3112, y: 878.0356, type: "middle" },
    { x: 171.3702, y: 877.4428, type: "middle" },
    { x: 132.7173, y: 874.9728, type: "end" }
  ],
  "1053": [
    { x: 250.7483, y: 895.5232, type: "start" },
    { x: 248.7661, y: 874.6764, type: "middle" },
    { x: 213.7172, y: 875.2692, type: "middle" },
    { x: 175.6049, y: 875.2692, type: "middle" },
    { x: 123.6172, y: 874.0836, type: "middle" },
    { x: 123.2568, y: 824.7824, type: "middle" },
    { x: 124.2479, y: 785.1636, type: "middle" },
    { x: 125.4192, y: 738.6288, type: "middle" },
    { x: 126.6806, y: 696.8364, type: "end" }
  ],
  "1108": [
    { x: 251.1988, y: 899.9692, type: "start" },
    { x: 252.3701, y: 876.356, type: "middle" },
    { x: 291.7438, y: 874.5776, type: "middle" },
    { x: 312.2866, y: 862.524, type: "end" }
  ],
  "1109": [
    { x: 253.0008, y: 898.4872, type: "start" },
    { x: 253.6315, y: 862.8204, type: "middle" },
    { x: 253.6315, y: 830.7104, type: "middle" },
    { x: 309.2232, y: 830.7104, type: "end" }
  ],
  "1010": [
    { x: 251.1988, y: 899.9692, type: "start" },
    { x: 251.8295, y: 844.0484, type: "middle" },
    { x: 253.0008, y: 800.4776, type: "middle" },
    { x: 311.0252, y: 798.1064, type: "end" }
  ],
  "1011": [
    { x: 251.1988, y: 899.9692, type: "start" },
    { x: 250.5681, y: 830.6116, type: "middle" },
    { x: 250.5681, y: 766.4904, type: "middle" },
    { x: 306.7905, y: 765.3048, type: "end" }
  ],
  "1012": [
    { x: 253.7216, y: 892.2628, type: "start" },
    { x: 265.0742, y: 837.824, type: "middle" },
    { x: 300.7538, y: 804.6272, type: "middle" },
    { x: 306.7905, y: 743.47, type: "middle" },
    { x: 307.4212, y: 690.8096, type: "middle" },
    { x: 330.3967, y: 681.1272, type: "end" }
  ],
  "1013": [
    { x: 251.7394, y: 893.646, type: "start" },
    { x: 253.2711, y: 847.21, type: "middle" },
    { x: 283.5447, y: 797.6124, type: "middle" },
    { x: 307.6915, y: 741.2964, type: "middle" },
    { x: 313.7282, y: 686.2648, type: "middle" },
    { x: 356.0752, y: 685.0792, type: "end" }
  ],
  "1014": [
    { x: 256.6949, y: 889.694, type: "start" },
    { x: 255.6137, y: 848.0004, type: "middle" },
    { x: 261.0197, y: 809.2708, type: "middle" },
    { x: 288.5903, y: 773.11, type: "middle" },
    { x: 305.5291, y: 736.2576, type: "middle" },
    { x: 310.0341, y: 685.8696, type: "middle" },
    { x: 344.4523, y: 683.3996, type: "middle" },
    { x: 384.3666, y: 683.9924, type: "end" }
  ],
  "1015": [
    { x: 255.7038, y: 893.646, type: "start" },
    { x: 259.8484, y: 840.6892, type: "middle" },
    { x: 279.5803, y: 795.0436, type: "middle" },
    { x: 307.6014, y: 748.1136, type: "middle" },
    { x: 310.0341, y: 686.4624, type: "middle" },
    { x: 360.2198, y: 684.684, type: "middle" },
    { x: 409.2342, y: 685.2768, type: "end" }
  ],
  "1016": [
    { x: 253.7216, y: 890.682, type: "start" },
    { x: 254.4424, y: 850.3716, type: "middle" },
    { x: 262.2811, y: 811.0492, type: "middle" },
    { x: 288.2299, y: 775.9752, type: "middle" },
    { x: 310.6648, y: 735.4672, type: "middle" },
    { x: 310.0341, y: 687.0552, type: "middle" },
    { x: 375.8972, y: 684.684, type: "middle" },
    { x: 435.8137, y: 683.9924, type: "end" }
  ],
  "دورة المياء": [
    { x: 253.7216, y: 890.682, type: "start" },
    { x: 263.7227, y: 846.9136, type: "middle" },
    { x: 281.6526, y: 807.9864, type: "middle" },
    { x: 299.4924, y: 772.122, type: "middle" },
    { x: 309.4935, y: 732.3056, type: "middle" },
    { x: 308.5024, y: 684.4864, type: "middle" },
    { x: 379.5913, y: 685.2768, type: "middle" },
    { x: 446.0851, y: 683.3996, type: "middle" },
    { x: 502.3075, y: 681.6212, type: "end" }
  ],
  "1018": [
    { x: 254.7127, y: 892.658, type: "start" },
    { x: 263.7227, y: 847.9016, type: "middle" },
    { x: 290.122, y: 802.6512, type: "middle" },
    { x: 306.9707, y: 752.362, type: "middle" },
    { x: 309.4034, y: 685.2768, type: "middle" },
    { x: 356.6158, y: 685.2768, type: "middle" },
    { x: 414.0095, y: 683.9924, type: "middle" },
    { x: 475.728, y: 685.2768, type: "middle" },
    { x: 542.2218, y: 685.8696, type: "middle" },
    { x: 542.4921, y: 736.2576, type: "end" }
  ],
  "1019": [
    { x: 254.7127, y: 892.658, type: "start" },
    { x: 259.6682, y: 843.8508, type: "middle" },
    { x: 287.0586, y: 796.5256, type: "middle" },
    { x: 308.2321, y: 746.3352, type: "middle" },
    { x: 309.4034, y: 685.8696, type: "middle" },
    { x: 366.8872, y: 685.2768, type: "middle" },
    { x: 441.2197, y: 685.2768, type: "middle" },
    { x: 488.4321, y: 682.8068, type: "middle" },
    { x: 545.1951, y: 685.2768, type: "middle" },
    { x: 545.1951, y: 762.0444, type: "middle" },
    { x: 543.3931, y: 835.2552, type: "end" }
  ],
  "1020": [
    { x: 253.7216, y: 892.658, type: "start" },
    { x: 255.6137, y: 846.716, type: "middle" },
    { x: 277.9585, y: 809.8636, type: "middle" },
    { x: 294.8973, y: 776.568, type: "middle" },
    { x: 309.4034, y: 731.8116, type: "middle" },
    { x: 310.6648, y: 684.684, type: "middle" },
    { x: 375.3566, y: 683.9924, type: "middle" },
    { x: 433.381, y: 683.3996, type: "middle" },
    { x: 481.7647, y: 684.684, type: "middle" },
    { x: 545.8258, y: 685.8696, type: "middle" },
    { x: 547.0872, y: 747.5208, type: "middle" },
    { x: 546.4565, y: 821.9172, type: "middle" },
    { x: 544.4743, y: 887.718, type: "end" }
  ],
  "1021": [
    { x: 257.686, y: 890.682, type: "start" },
    { x: 261.0197, y: 849.7788, type: "middle" },
    { x: 274.3545, y: 815.8904, type: "middle" },
    { x: 288.8606, y: 777.7536, type: "middle" },
    { x: 304.6281, y: 743.2724, type: "middle" },
    { x: 311.2054, y: 687.648, type: "middle" },
    { x: 386.7993, y: 687.0552, type: "middle" },
    { x: 472.6646, y: 686.4624, type: "middle" },
    { x: 545.1951, y: 685.2768, type: "middle" },
    { x: 546.4565, y: 727.2668, type: "middle" },
    { x: 548.2585, y: 788.7204, type: "middle" },
    { x: 548.8892, y: 841.282, type: "middle" },
    { x: 550.511, y: 894.7328, type: "end" }
  ],
  "1022": [
    { x: 256.6949, y: 890.682, type: "start" },
    { x: 254.7127, y: 848.8896, type: "middle" },
    { x: 271.9218, y: 811.642, type: "middle" },
    { x: 305.7994, y: 788.7204, type: "middle" },
    { x: 307.6014, y: 739.1228, type: "middle" },
    { x: 308.8628, y: 687.0552, type: "middle" },
    { x: 382.024, y: 687.0552, type: "middle" },
    { x: 461.7625, y: 685.2768, type: "middle" },
    { x: 540.4198, y: 682.8068, type: "middle" },
    { x: 547.0872, y: 727.5632, type: "middle" },
    { x: 548.2585, y: 772.9124, type: "middle" },
    { x: 550.511, y: 813.0252, type: "end" }
  ],
  "1023": [
    { x: 250.7483, y: 890.682, type: "start" },
    { x: 250.2077, y: 846.1232, type: "middle" },
    { x: 283.4546, y: 799.5884, type: "middle" },
    { x: 299.132, y: 749.398, type: "middle" },
    { x: 310.4846, y: 685.4744, type: "middle" },
    { x: 366.8872, y: 685.2768, type: "middle" },
    { x: 430.3176, y: 685.2768, type: "middle" },
    { x: 489.6034, y: 685.8696, type: "middle" },
    { x: 548.8892, y: 687.648, type: "middle" },
    { x: 550.511, y: 743.2724, type: "end" }
  ],
  "1024": [
    { x: 254.7127, y: 892.658, type: "start" },
    { x: 252.7305, y: 845.8268, type: "middle" },
    { x: 276.607, y: 812.0372, type: "middle" },
    { x: 295.528, y: 782.002, type: "middle" },
    { x: 308.2321, y: 737.2456, type: "middle" },
    { x: 309.4034, y: 685.8696, type: "middle" },
    { x: 378.9606, y: 682.8068, type: "middle" },
    { x: 448.5178, y: 683.9924, type: "middle" },
    { x: 503.4788, y: 682.214, type: "middle" },
    { x: 552.4932, y: 687.0552, type: "end" }
  ],
  "المسرح": [
    { x: 253.7216, y: 891.67, type: "start" },
    { x: 267.6871, y: 831.896, type: "middle" },
    { x: 295.528, y: 787.0408, type: "middle" },
    { x: 308.2321, y: 735.4672, type: "middle" },
    { x: 308.8628, y: 685.8696, type: "middle" },
    { x: 369.8605, y: 683.3996, type: "middle" },
    { x: 432.7503, y: 681.6212, type: "middle" },
    { x: 507.7135, y: 682.8068, type: "middle" },
    { x: 582.6767, y: 683.3996, type: "middle" },
    { x: 652.8646, y: 685.2768, type: "end" }
  ],
  "1025": [
    { x: 256.2444, y: 896.4124, type: "start" },
    { x: 262.9118, y: 844.9376, type: "middle" },
    { x: 284.6259, y: 783.8792, type: "middle" },
    { x: 309.4034, y: 737.2456, type: "middle" },
    { x: 312.4668, y: 682.5104, type: "middle" },
    { x: 401.1252, y: 682.5104, type: "middle" },
    { x: 460.8615, y: 681.5224, type: "middle" },
    { x: 527.5355, y: 681.5224, type: "middle" },
    { x: 603.8502, y: 681.6212, type: "middle" },
    { x: 678.8134, y: 683.9924, type: "middle" },
    { x: 748.3706, y: 683.9924, type: "end" }
  ],
  "1026": [
    { x: 250.7483, y: 892.658, type: "start" },
    { x: 253.8117, y: 849.186, type: "middle" },
    { x: 274.6248, y: 819.9412, type: "middle" },
    { x: 288.5903, y: 786.0528, type: "middle" },
    { x: 303.9974, y: 761.4516, type: "middle" },
    { x: 306.5202, y: 727.2668, type: "middle" },
    { x: 309.4034, y: 684.684, type: "middle" },
    { x: 362.0218, y: 685.2768, type: "middle" },
    { x: 418.8749, y: 683.9924, type: "middle" },
    { x: 476.2686, y: 683.9924, type: "middle" },
    { x: 542.8525, y: 682.8068, type: "middle" },
    { x: 617.185, y: 683.3996, type: "middle" },
    { x: 690.9769, y: 684.684, type: "middle" },
    { x: 758.1014, y: 683.9924, type: "middle" },
    { x: 758.642, y: 740.3084, type: "end" }
  ],
  "1027": [
    { x: 251.7394, y: 890.682, type: "start" },
    { x: 256.6949, y: 841.8748, type: "middle" },
    { x: 293.726, y: 798.9956, type: "middle" },
    { x: 306.9707, y: 748.1136, type: "middle" },
    { x: 308.2321, y: 687.0552, type: "middle" },
    { x: 369.8605, y: 684.684, type: "middle" },
    { x: 444.2831, y: 682.8068, type: "middle" },
    { x: 519.877, y: 682.214, type: "middle" },
    { x: 594.8402, y: 682.8068, type: "middle" },
    { x: 669.8034, y: 682.8068, type: "middle" },
    { x: 760.444, y: 683.9924, type: "middle" },
    { x: 761.0747, y: 759.0804, type: "middle" },
    { x: 759.6331, y: 831.896, type: "end" }
  ],
  "1028": [
    { x: 248.7661, y: 890.682, type: "start" },
    { x: 251.7394, y: 841.8748, type: "middle" },
    { x: 283.4546, y: 792.2772, type: "middle" },
    { x: 306.9707, y: 743.2724, type: "middle" },
    { x: 309.4034, y: 686.4624, type: "middle" },
    { x: 377.7893, y: 683.9924, type: "middle" },
    { x: 438.787, y: 683.3996, type: "middle" },
    { x: 502.9382, y: 679.1512, type: "middle" },
    { x: 570.0627, y: 682.214, type: "middle" },
    { x: 641.3318, y: 683.9924, type: "middle" },
    { x: 704.2216, y: 684.684, type: "middle" },
    { x: 760.444, y: 685.2768, type: "middle" },
    { x: 760.444, y: 752.362, type: "middle" },
    { x: 759.9034, y: 825.5728, type: "middle" },
    { x: 754.5875, y: 902.6368, type: "end" }
  ],
  "1029": [
    { x: 250.7483, y: 890.0892, type: "start" },
    { x: 250.7483, y: 842.27, type: "middle" },
    { x: 282.6437, y: 803.4416, type: "middle" },
    { x: 302.5558, y: 753.6464, type: "middle" },
    { x: 310.4846, y: 682.9056, type: "middle" },
    { x: 387.1597, y: 680.9296, type: "middle" },
    { x: 464.8259, y: 681.5224, type: "middle" },
    { x: 534.3831, y: 681.5224, type: "middle" },
    { x: 605.6522, y: 681.5224, type: "middle" },
    { x: 683.0481, y: 682.708, type: "middle" },
    { x: 763.5074, y: 683.9924, type: "middle" },
    { x: 767.7421, y: 754.1404, type: "middle" },
    { x: 771.3461, y: 833.378, type: "middle" },
    { x: 771.9768, y: 906.5888, type: "end" }
  ],
  "1030": [
    { x: 253.7216, y: 886.1372, type: "start" },
    { x: 254.983, y: 847.3088, type: "middle" },
    { x: 285.2566, y: 799.4896, type: "middle" },
    { x: 307.6014, y: 748.7064, type: "middle" },
    { x: 308.2321, y: 685.7708, type: "middle" },
    { x: 383.826, y: 683.9924, type: "middle" },
    { x: 470.2319, y: 683.9924, type: "middle" },
    { x: 551.3219, y: 683.9924, type: "middle" },
    { x: 636.5565, y: 683.9924, type: "middle" },
    { x: 715.7544, y: 683.3996, type: "middle" },
    { x: 766.4807, y: 682.708, type: "middle" },
    { x: 770.7154, y: 753.5476, type: "middle" },
    { x: 770.5352, y: 810.3576, type: "end" }
  ],
  "1031": [
    { x: 260.6593, y: 896.116, type: "start" },
    { x: 261.7405, y: 850.2728, type: "middle" },
    { x: 285.617, y: 806.4056, type: "middle" },
    { x: 308.5024, y: 735.6648, type: "middle" },
    { x: 308.5024, y: 682.9056, type: "middle" },
    { x: 375.3566, y: 683.9924, type: "middle" },
    { x: 435.183, y: 683.3996, type: "middle" },
    { x: 510.1462, y: 682.708, type: "middle" },
    { x: 586.9114, y: 682.708, type: "middle" },
    { x: 660.0726, y: 683.3996, type: "middle" },
    { x: 722.4218, y: 682.708, type: "middle" },
    { x: 768.3728, y: 686.3636, type: "middle" },
    { x: 771.3461, y: 742.0868, type: "end" }
  ],
  "1032": [
    { x: 249.7572, y: 889.694, type: "start" },
    { x: 252.5503, y: 848.8896, type: "middle" },
    { x: 287.6893, y: 798.6992, type: "middle" },
    { x: 310.0341, y: 738.8264, type: "middle" },
    { x: 312.4668, y: 686.166, type: "middle" },
    { x: 438.787, y: 685.5732, type: "middle" },
    { x: 536.7257, y: 683.7948, type: "middle" },
    { x: 617.185, y: 683.7948, type: "middle" },
    { x: 701.2483, y: 683.202, type: "middle" },
    { x: 771.3461, y: 682.0164, type: "end" }
  ],
  "1033": [
    { x: 250.7483, y: 893.0532, type: "start" },
    { x: 253.7216, y: 845.234, type: "middle" },
    { x: 295.528, y: 798.1064, type: "middle" },
    { x: 310.0341, y: 747.916, type: "middle" },
    { x: 310.6648, y: 686.166, type: "middle" },
    { x: 394.638, y: 684.3876, type: "middle" },
    { x: 482.3053, y: 684.3876, type: "middle" },
    { x: 564.5666, y: 684.3876, type: "middle" },
    { x: 661.334, y: 683.202, type: "middle" },
    { x: 750.8033, y: 681.3248, type: "middle" },
    { x: 783.4195, y: 649.9064, type: "end" }
  ]
};

if (typeof module !== 'undefined') {
  module.exports = pathsMap;
}
