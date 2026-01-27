import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';

export default function Map() {
  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: 45.4973,
          longitude: -73.5794,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},});