'use strict';

var DEFAULT_FEE = 10000;

function doTransaction(keypair, toAddress, callback) {
    var txBuilder = new bitcoin.bitcoin.TransactionBuilder();

    var fromAddress = keypair.getAddress();
    var amount = 0;
    $.get('https://bitcoin.toshi.io/api/v0/addresses/' + fromAddress + '/transactions').done(function (res) {
        res.transactions.forEach(function (tx) {
            tx.outputs.forEach(function (output, i) {
                if (output.spent) {
                    return;
                }
                txBuilder.addInput(tx.hash, i);
                amount += output.amount;
            });
        });

        amount -= DEFAULT_FEE;
        if (amount <= 0) {
            $('#alerts').append('\n                    <div class="alert alert-danger" role="alert">Cap balance too low to redeem</div>\n                ');
            return;
        }
        txBuilder.addOutput(toAddress, amount);
        txBuilder.inputs.forEach(function (input, i) {
            txBuilder.sign(i, keypair);
        });

        var txHex = txBuilder.build().toHex();
        $.ajax({
            method: 'POST',
            url: 'http://btc.blockr.io/api/v1/tx/push',
            data: { hex: txHex }
        }).done(function (res) {
            res = JSON.parse(res);
            if (res.error) {
                callback(res.error);
            } else {
                callback(null, res);
            }
        }).error(function (err) {
            callback(JSON.stringify(err));
        });
    }).error(function (err) {
        if (err.status === 404) {
            $('#alerts').append('\n                    <div class="alert alert-danger" role="alert">No transactions to redeem</div>\n                ');
        } else {
            $('#alerts').append('\n                    <div class="alert alert-danger" role="alert">' + err.message + '</div>\n                ');
        }
    });
}

function updateBalances(addr) {
    var $confirmedBalance = $('#confirmedBalance');
    var $unconfirmedBalance = $('#unconfirmedBalance');
    $.get('https://bitcoin.toshi.io/api/v0/addresses/' + addr).done(function (res) {
        var balance = +res.balance || 0;
        $confirmedBalance.find('span.value').text(balance / 100);

        var unconfirmedBalance = +res.unconfirmed_balance || 0;
        if (unconfirmedBalance !== 0) {
            $unconfirmedBalance.show();
            $unconfirmedBalance.find('span.value').text(unconfirmedBalance / 100);
        }
    }).error(function () {
        $confirmedBalance.find('span.value').text(0);
    });
}
$(document).ready(function () {
    var addrAndPriv = window.location.pathname.slice(1).split(':');
    if (!addrAndPriv || addrAndPriv.length !== 2) {
        $('#alerts').append('\n            <div class="alert alert-danger" role="alert">Invalid URI</div>\n        ');
        return;
    }
    var addr = addrAndPriv[0];
    $('#address').text(addr);
    updateBalances(addr);
    setInterval(function () {
        return updateBalances(addr);
    }, 15 * 1000);
    var priv = addrAndPriv[1];
    var privBuffer = bitcoin.base58.decode(priv);
    var d = bitcoin.BigInteger.fromBuffer(privBuffer);
    var keypair = new bitcoin.bitcoin.ECPair(d);
    if (keypair.getAddress() !== addr) {
        $('#alerts').append('\n            <div class="alert alert-danger" role="alert">Private key does not match address</div>\n        ');
        return;
    }
    $('#alerts').append('\n        <div class="alert alert-success" role="alert">Bottlecap verified</div>\n    ');
    var $redeemButton = $('#redeemButton');
    var $redeemForm = $('#redeemForm');
    $redeemButton.click(function () {
        $redeemForm.slideToggle('fast');
    });
    $redeemForm.submit(function (e) {
        e.preventDefault();
        var $redeemAddress = $('#redeemAddress');
        var address = $redeemAddress.val();
        try {
            doTransaction(keypair, address, function (err, res) {
                $redeemAddress.val('');
                if (!err && res) {
                    console.log(JSON.stringify(res));
                } else {
                    $('#alerts').append('\n                        <div class="alert alert-danger" role="alert">Transaction error: ' + err + '</div>\n                    ');
                }
            });
        } catch (err) {
            $('#alerts').append('\n                <div class="alert alert-danger" role="alert">Transaction error: ' + err.message + '</div>\n            ');
        }
    });
    var $downloadWIF = $redeemForm.find('#downloadWIFButton');
    $downloadWIF.click(function () {
        var wif = keypair.toWIF();
        $downloadWIF.attr('href', 'data:text/plain,' + wif);
        $downloadWIF.attr('download', addr + '.wif');
    });
});