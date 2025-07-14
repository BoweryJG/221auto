import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const {width} = Dimensions.get('window');

interface Device {
  id: string;
  name: string;
  type: 'switchbot' | 'yale' | 'sonos';
  status: string;
  icon: string;
}

interface NowPlaying {
  title: string;
  artist: string;
  source: 'spotify' | 'hypem';
  mood?: string;
}

function App(): React.JSX.Element {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // Mock data for now - will connect to real API
    setTimeout(() => {
      setDevices([
        {id: '1', name: 'Living Room Switch', type: 'switchbot', status: 'on', icon: '💡'},
        {id: '2', name: 'Front Door', type: 'yale', status: 'locked', icon: '🔒'},
        {id: '3', name: 'Living Room Speaker', type: 'sonos', status: 'playing', icon: '🔊'},
      ]);
      setNowPlaying({
        title: 'Midnight City',
        artist: 'M83',
        source: 'spotify',
        mood: 'chill',
      });
      setLoading(false);
    }, 1000);
  }, []);

  const MoodIndicator = ({mood}: {mood: string}) => {
    const moodColors: {[key: string]: string[]} = {
      party: ['#FF6B6B', '#FFE66D'],
      chill: ['#4ECDC4', '#556270'],
      intense: ['#FF6B6B', '#C44569'],
      acoustic: ['#F7B731', '#5F27CD'],
      dance: ['#00D2FF', '#3A7BD5'],
    };

    const colors = moodColors[mood] || ['#667eea', '#764ba2'];

    return (
      <LinearGradient
        colors={colors}
        style={styles.moodIndicator}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}>
        <Text style={styles.moodText}>{mood.toUpperCase()}</Text>
      </LinearGradient>
    );
  };

  const DeviceCard = ({device}: {device: Device}) => (
    <TouchableOpacity style={styles.deviceCard} activeOpacity={0.7}>
      <Text style={styles.deviceIcon}>{device.icon}</Text>
      <Text style={styles.deviceName}>{device.name}</Text>
      <Text style={styles.deviceStatus}>{device.status}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>HomeFlow</Text>
            <View style={[styles.connectionDot, wsConnected ? styles.connected : styles.disconnected]} />
          </View>

          {nowPlaying && (
            <View style={styles.nowPlayingCard}>
              <Text style={styles.sectionTitle}>Now Playing</Text>
              <Text style={styles.trackTitle}>{nowPlaying.title}</Text>
              <Text style={styles.trackArtist}>{nowPlaying.artist}</Text>
              <View style={styles.sourceRow}>
                <Text style={styles.sourceText}>via {nowPlaying.source}</Text>
                {nowPlaying.mood && <MoodIndicator mood={nowPlaying.mood} />}
              </View>
              <View style={styles.controls}>
                <TouchableOpacity style={styles.controlButton}>
                  <Text style={styles.controlIcon}>⏮</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton}>
                  <Text style={styles.controlIcon}>⏸</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton}>
                  <Text style={styles.controlIcon}>⏭</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Devices</Text>
            <View style={styles.deviceGrid}>
              {devices.map(device => (
                <DeviceCard key={device.id} device={device} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Scenes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity style={styles.sceneButton}>
                <Text style={styles.sceneIcon}>🌅</Text>
                <Text style={styles.sceneText}>Morning</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sceneButton}>
                <Text style={styles.sceneIcon}>🎉</Text>
                <Text style={styles.sceneText}>Party</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sceneButton}>
                <Text style={styles.sceneIcon}>😴</Text>
                <Text style={styles.sceneText}>Sleep</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sceneButton}>
                <Text style={styles.sceneIcon}>🏠</Text>
                <Text style={styles.sceneText}>Away</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  connectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  connected: {
    backgroundColor: '#4ade80',
  },
  disconnected: {
    backgroundColor: '#f87171',
  },
  nowPlayingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    margin: 20,
    padding: 20,
    borderRadius: 20,
    backdropFilter: 'blur(10px)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  trackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  trackArtist: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sourceText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  moodIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moodText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIcon: {
    fontSize: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  deviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  deviceCard: {
    width: (width - 55) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  deviceIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  deviceStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  sceneButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginRight: 10,
    width: 100,
  },
  sceneIcon: {
    fontSize: 32,
    marginBottom: 5,
  },
  sceneText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default App;