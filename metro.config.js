// Expo'nun varsayılan Metro config'i — expo-doctor "Metro config" kontrolü
// dosyanın expo/metro-config'i extend etmesini şart koşuyor (v1.19+).
// Özelleştirme gerekirse bu objeyi mutate ederek yap, baştan yaratma.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
