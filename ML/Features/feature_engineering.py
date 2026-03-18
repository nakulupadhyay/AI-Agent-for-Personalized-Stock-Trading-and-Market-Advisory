import ta

def add_features(data):

    data["rsi"] = ta.momentum.RSIIndicator(data["Close"]).rsi()

    macd = ta.trend.MACD(data["Close"])
    data["macd"] = macd.macd()
    data["macd_signal"] = macd.macd_signal()

    bb = ta.volatility.BollingerBands(data["Close"])
    data["bb_high"] = bb.bollinger_hband()
    data["bb_low"] = bb.bollinger_lband()

    atr = ta.volatility.AverageTrueRange(
        data["High"],
        data["Low"],
        data["Close"]
    )

    data["atr"] = atr.average_true_range()

    data["ma20"] = data["Close"].rolling(20).mean()
    data["ma50"] = data["Close"].rolling(50).mean()

    data.dropna(inplace=True)

    return data