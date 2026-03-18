import ta

def add_features(data):

    data["rsi"] = ta.momentum.RSIIndicator(data["Close"]).rsi()

    macd = ta.trend.MACD(data["Close"])
    data["macd"] = macd.macd()
    data["macd_signal"] = macd.macd_signal()