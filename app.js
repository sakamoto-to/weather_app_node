const axios = require('axios');
const readline = require('readline-sync');
const fs = require('fs');
const path = require('path');

/**
 * 天気予報アプリケーションのメインクラス
 * OpenWeatherMap APIを使用して天気情報を取得・表示する機能を提供します
 */
class WeatherApp {
    /**
     * WeatherAppのコンストラクタ
     * APIキー、ベースURL、設定ファイル、お気に入り都市の初期化を行います
     */
    constructor() {
        this.apiKey = this.loadApiKey();
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        this.configFile = 'weather_config.json';
        this.favoriteCities = this.loadFavoriteCities();
    }

    /**
     * 設定ファイルからAPIキーを読み込みます
     * @returns {string|null} APIキー、設定ファイルが存在しない場合はnull
     */
    loadApiKey() {
        const configPath = 'weather_config.json';
        try {
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                return config.apiKey;
            }
        } catch (error) {
            console.log('設定ファイルが見つかりません。');
        }
        return null;
    }

    /**
     * OpenWeatherMap APIのキーを設定します
     * ユーザーから入力を受け付け、設定ファイルに保存します
     */
    setupApiKey() {
        console.log('🌤️  OpenWeatherMap API設定');
        console.log('APIキーを取得するには: https://openweathermap.org/api');
        console.log('無料アカウントでも使用できます。');
        
        const apiKey = readline.question('APIキーを入力してください: ');
        
        const config = {
            apiKey: apiKey,
            setupDate: new Date().toISOString()
        };
        
        fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
        this.apiKey = apiKey;
        console.log('✅ APIキーが保存されました！');
    }

    /**
     * お気に入りの都市リストをファイルから読み込みます
     * @returns {string[]} お気に入り都市の配列
     */
    loadFavoriteCities() {
        const favoritesFile = 'favorite_cities.json';
        try {
            if (fs.existsSync(favoritesFile)) {
                return JSON.parse(fs.readFileSync(favoritesFile, 'utf8'));
            }
        } catch (error) {
            console.log('お気に入り都市ファイルの読み込みに失敗しました。');
        }
        return [];
    }

    /**
     * お気に入りの都市リストをファイルに保存します
     */
    saveFavoriteCities() {
        const favoritesFile = 'favorite_cities.json';
        fs.writeFileSync(favoritesFile, JSON.stringify(this.favoriteCities, null, 2));
    }

    /**
     * 指定された都市の現在の天気を取得します
     * @param {string} city 都市名
     * @returns {Promise<Object>} 天気情報のオブジェクト
     * @throws {Error} API通信エラーまたは都市が見つからない場合
     */
    async getCurrentWeather(city) {
        try {
            const response = await axios.get(`${this.baseUrl}/weather`, {
                params: {
                    q: city,
                    appid: this.apiKey,
                    units: 'metric',
                    lang: 'ja'
                }
            });
            
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('都市が見つかりません。都市名を確認してください。');
            } else if (error.response?.status === 401) {
                throw new Error('APIキーが無効です。設定を確認してください。');
            }
            throw new Error('天気情報の取得に失敗しました。');
        }
    }

    /**
     * 指定された都市の5日間天気予報を取得します
     * @param {string} city 都市名
     * @returns {Promise<Object>} 天気予報情報のオブジェクト
     * @throws {Error} API通信エラーの場合
     */
    async getForecast(city) {
        try {
            const response = await axios.get(`${this.baseUrl}/forecast`, {
                params: {
                    q: city,
                    appid: this.apiKey,
                    units: 'metric',
                    lang: 'ja'
                }
            });
            
            return response.data;
        } catch (error) {
            throw new Error('天気予報の取得に失敗しました。');
        }
    }

    /**
     * 現在の天気情報を整形して表示します
     * @param {Object} data 天気情報のオブジェクト
     */
    displayCurrentWeather(data) {
        console.log('\n🌍 現在の天気情報');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📍 都市: ${data.name}, ${data.sys.country}`);
        console.log(`🌡️  気温: ${data.main.temp}°C (体感温度: ${data.main.feels_like}°C)`);
        console.log(`☁️  天気: ${data.weather[0].description}`);
        console.log(`💧 湿度: ${data.main.humidity}%`);
        console.log(`🌪️  風速: ${data.wind.speed} m/s`);
        console.log(`📊 気圧: ${data.main.pressure} hPa`);
        
        if (data.visibility) {
            console.log(`👁️  視界: ${(data.visibility / 1000).toFixed(1)} km`);
        }
        
        const sunrise = new Date(data.sys.sunrise * 1000);
        const sunset = new Date(data.sys.sunset * 1000);
        console.log(`🌅 日の出: ${sunrise.toLocaleTimeString('ja-JP')}`);
        console.log(`🌇 日の入: ${sunset.toLocaleTimeString('ja-JP')}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    /**
     * 5日間の天気予報を整形して表示します
     * @param {Object} data 天気予報情報のオブジェクト
     */
    displayForecast(data) {
        console.log('\n📅 5日間天気予報');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const dailyForecasts = {};
        
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateKey = date.toLocaleDateString('ja-JP');
            
            if (!dailyForecasts[dateKey]) {
                dailyForecasts[dateKey] = {
                    date: dateKey,
                    temps: [],
                    weather: item.weather[0].description,
                    humidity: item.main.humidity,
                    windSpeed: item.wind.speed
                };
            }
            
            dailyForecasts[dateKey].temps.push(item.main.temp);
        });
        
        Object.values(dailyForecasts).slice(0, 5).forEach(forecast => {
            const minTemp = Math.min(...forecast.temps);
            const maxTemp = Math.max(...forecast.temps);
            
            console.log(`📆 ${forecast.date}`);
            console.log(`   🌡️  ${minTemp.toFixed(1)}°C - ${maxTemp.toFixed(1)}°C`);
            console.log(`   ☁️  ${forecast.weather}`);
            console.log(`   💧 湿度: ${forecast.humidity}%`);
            console.log(`   🌪️  風速: ${forecast.windSpeed} m/s`);
            console.log('');
        });
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    /**
     * 新しい都市をお気に入りリストに追加します
     * @param {string} city 追加する都市名
     */
    addFavoriteCity(city) {
        if (!this.favoriteCities.includes(city)) {
            this.favoriteCities.push(city);
            this.saveFavoriteCities();
            console.log(`✅ "${city}" をお気に入りに追加しました。`);
        } else {
            console.log(`"${city}" は既にお気に入りに登録されています。`);
        }
    }

    /**
     * 指定された都市をお気に入りリストから削除します
     * @param {string} city 削除する都市名
     */
    removeFavoriteCity(city) {
        const index = this.favoriteCities.indexOf(city);
        if (index > -1) {
            this.favoriteCities.splice(index, 1);
            this.saveFavoriteCities();
            console.log(`✅ "${city}" をお気に入りから削除しました。`);
        } else {
            console.log(`"${city}" はお気に入りに登録されていません。`);
        }
    }

    /**
     * お気に入りの都市一覧を表示します
     */
    displayFavoriteCities() {
        if (this.favoriteCities.length === 0) {
            console.log('お気に入りの都市はありません。');
            return;
        }
        
        console.log('\n⭐ お気に入りの都市:');
        this.favoriteCities.forEach((city, index) => {
            console.log(`${index + 1}. ${city}`);
        });
        console.log('');
    }

    /**
     * アプリケーションのメインループを実行します
     * ユーザーの入力に応じて各機能を呼び出します
     */
    async run() {
        console.log('🌤️  天気予報アプリへようこそ！');
        
        if (!this.apiKey) {
            this.setupApiKey();
        }
        
        while (true) {
            console.log('\n--- メニュー ---');
            console.log('1. 現在の天気を取得');
            console.log('2. 5日間天気予報を取得');
            console.log('3. お気に入り都市を表示');
            console.log('4. お気に入り都市を追加');
            console.log('5. お気に入り都市を削除');
            console.log('6. API設定を変更');
            console.log('7. 終了');
            
            const choice = readline.question('選択してください (1-7): ');
            
            try {
                switch (choice) {
                    case '1':
                        await this.handleCurrentWeather();
                        break;
                    case '2':
                        await this.handleForecast();
                        break;
                    case '3':
                        this.displayFavoriteCities();
                        break;
                    case '4':
                        this.handleAddFavorite();
                        break;
                    case '5':
                        this.handleRemoveFavorite();
                        break;
                    case '6':
                        this.setupApiKey();
                        break;
                    case '7':
                        console.log('アプリケーションを終了します。お疲れ様でした！');
                        return;
                    default:
                        console.log('無効な選択です。1-7の数字を入力してください。');
                }
            } catch (error) {
                console.log(`❌ エラー: ${error.message}`);
            }
        }
    }

    /**
     * 現在の天気を取得して表示する処理を実行します
     */
    async handleCurrentWeather() {
        const city = this.getCityInput();
        if (!city) return;
        
        console.log('🔄 天気情報を取得中...');
        const weather = await this.getCurrentWeather(city);
        this.displayCurrentWeather(weather);
    }

    /**
     * 天気予報を取得して表示する処理を実行します
     */
    async handleForecast() {
        const city = this.getCityInput();
        if (!city) return;
        
        console.log('🔄 天気予報を取得中...');
        const forecast = await this.getForecast(city);
        this.displayForecast(forecast);
    }

    /**
     * ユーザーから都市名の入力を受け付けます
     * @returns {string} 入力された都市名
     */
    getCityInput() {
        this.displayFavoriteCities();
        const city = readline.question('都市名を入力してください（例: Tokyo, London, New York）: ');
        return city.trim();
    }

    /**
     * お気に入り都市の追加処理を実行します
     */
    handleAddFavorite() {
        const city = readline.question('お気に入りに追加する都市名を入力してください: ');
        if (city.trim()) {
            this.addFavoriteCity(city.trim());
        }
    }

    /**
     * お気に入り都市の削除処理を実行します
     */
    handleRemoveFavorite() {
        this.displayFavoriteCities();
        if (this.favoriteCities.length === 0) return;
        
        const city = readline.question('削除する都市名を入力してください: ');
        if (city.trim()) {
            this.removeFavoriteCity(city.trim());
        }
    }
}

// アプリケーションの実行
const app = new WeatherApp();
app.run().catch(error => {
    console.error('アプリケーションエラー:', error.message);
});
