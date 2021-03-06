'use strict';

function mintSingleCap(capValue, keypair) {
    var $el = $('<div class="row list-group-item-text"></div>');
    var $canvas = $('<canvas class="qrcode col-xs-4"></canvas>');
    var address = keypair.getAddress();
    var priv = bitcoin.base58.encode(keypair.d.toBuffer(32));
    var capUri = 'http://btcp.trade/' + address + ':' + priv;
    qr.canvas({
        canvas: $canvas[0],
        value: capUri
    });
    $el.append($canvas);
    var $controls = $('<div class="col-xs-8"> </div>');
    $controls.append('\n        <div class="row">\n            <div><h5>' + address + '</h5></div>\n            <h4>\n                <a href="bitcoin:' + address + '?amount=' + capValue / 1e6 + '">\n                    Fund ' + capValue + ' bits\n                </a>\n            </h4>\n        </div>\n    ');

    $el.append($controls);
    return {
        $el: $el,
        address: address
    };
}

$(document).ready(function () {
    $('#mintForm').submit(function (e) {
        e.preventDefault();
        var $capsOutput = $('#capsOutput');
        $capsOutput.html('');
        var capsAmount = +$('#capsAmountInput').val();
        var capsValue = +$('#capsValueInput').val();
        var addresses = [];
        for (var i = 0; i < capsAmount; i++) {
            var keypair = bitcoin.bitcoin.ECPair.makeRandom();
            var cap = mintSingleCap(capsValue, keypair);
            var $li = $('<li class="list-group-item"></li>');
            $li.append(cap.$el);
            $capsOutput.append($li);
            addresses.push(cap.address);
        }
        var $qrCodes = $capsOutput.find('canvas.qrcode');
        var $canvas = $('<canvas></canvas>');
        var height = $qrCodes.attr('height');
        $canvas.attr('height', height * $qrCodes.length);
        var ctx = $canvas[0].getContext('2d');
        $qrCodes.each(function (i, $qrCode) {
            var qrCodeDataURL = $qrCode.toDataURL();
            var image = new Image();
            image.onload = function () {
                ctx.drawImage(image, 0, height * i);
            };
            image.src = qrCodeDataURL;
        });

        $('#printable').show();
        var $printableLink = $("#printableLink");
        $printableLink.click(function () {
            var canvasDataURL = $canvas[0].toDataURL('image/png');
            $printableLink.attr('href', canvasDataURL);
            var hash = bitcoin.bitcoin.crypto.hash160(addresses.join(''));
            $printableLink.attr('download', 'btcp-' + bitcoin.base58.encode(hash) + '.png');
        });
    });
});