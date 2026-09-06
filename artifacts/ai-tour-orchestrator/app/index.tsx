import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ImageBackground,
  KeyboardTypeOptions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import colors from '@/constants/colors';

type Role = 'traveler' | 'agent' | 'admin';
type Section = 'home' | 'trip' | 'plan' | 'support' | 'profile';
type ModalKind = 'role' | 'compare' | 'safety' | 'replan' | 'notifications' | null;

type AppState = {
  role: Role;
  itineraryGenerated: boolean;
  booked: boolean;
  issueRaised: boolean;
  replanApproved: boolean;
  agentConfirmed: boolean;
};

const STORAGE_KEY = 'tour-orchestrator-state';
const initialState: AppState = {
  role: 'traveler',
  itineraryGenerated: true,
  booked: false,
  issueRaised: false,
  replanApproved: false,
  agentConfirmed: false,
};

const roleCopy: Record<Role, { label: string; eyebrow: string; icon: keyof typeof Ionicons.glyphMap }> = {
  traveler: { label: 'Traveler', eyebrow: 'Your next chapter', icon: 'person-outline' },
  agent: { label: 'Tour agent', eyebrow: 'Today on the ground', icon: 'briefcase-outline' },
  admin: { label: 'Admin control', eyebrow: 'Platform pulse', icon: 'shield-checkmark-outline' },
};

const navItems: { key: Section; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', label: 'Home', icon: 'home-outline' },
  { key: 'trip', label: 'My trip', icon: 'map-outline' },
  { key: 'plan', label: 'Plan', icon: 'sparkles-outline' },
  { key: 'support', label: 'Support', icon: 'heart-outline' },
  { key: 'profile', label: 'Profile', icon: 'person-outline' },
];

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.light.background },
  content: { paddingHorizontal: 20, paddingBottom: 34 },
  header: { paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCopy: { flex: 1, paddingRight: 12 },
  eyebrow: { color: colors.light.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { color: colors.light.navy, fontFamily: 'Inter_700Bold', fontSize: 30, lineHeight: 36, marginTop: 4 },
  subtitle: { color: colors.light.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, marginTop: 6 },
  iconButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.light.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.light.border },
  notificationDot: { position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 7, backgroundColor: colors.light.coral, borderWidth: 1, borderColor: colors.light.white },
  avatar: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.light.navy },
  avatarText: { color: colors.light.white, fontFamily: 'Inter_700Bold', fontSize: 15 },
  section: { marginTop: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  sectionTitle: { color: colors.light.navy, fontFamily: 'Inter_700Bold', fontSize: 18 },
  sectionLink: { color: colors.light.blue, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  hero: { height: 224, borderRadius: 26, overflow: 'hidden', marginTop: 23, backgroundColor: colors.light.navy },
  heroImage: { flex: 1, justifyContent: 'flex-end' },
  heroGradient: { padding: 20, paddingTop: 56 },
  heroKicker: { color: 'rgba(255,255,255,0.78)', fontFamily: 'Inter_600SemiBold', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  heroTitle: { color: colors.light.white, fontFamily: 'Inter_700Bold', fontSize: 27, lineHeight: 31, marginTop: 5 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  heroMetaText: { color: 'rgba(255,255,255,0.86)', fontFamily: 'Inter_500Medium', fontSize: 12 },
  statusPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 100, backgroundColor: colors.light.greenSoft },
  statusDot: { width: 6, height: 6, borderRadius: 6, backgroundColor: colors.light.green },
  statusText: { color: colors.light.green, fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  tripCard: { backgroundColor: colors.light.white, borderRadius: 22, borderWidth: 1, borderColor: colors.light.border, padding: 16 },
  tripCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripCardLabel: { color: colors.light.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 12 },
  tripCardValue: { color: colors.light.navy, fontFamily: 'Inter_700Bold', fontSize: 16, marginTop: 4 },
  tripCardDivider: { height: 1, backgroundColor: colors.light.border, marginVertical: 15 },
  tripCardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextStop: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  nextStopIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.light.sky, alignItems: 'center', justifyContent: 'center' },
  nextStopText: { color: colors.light.navy, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  nextStopSubtext: { color: colors.light.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  primaryButton: { backgroundColor: colors.light.blue, minHeight: 48, paddingHorizontal: 17, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryButtonText: { color: colors.light.white, fontFamily: 'Inter_700Bold', fontSize: 14 },
  secondaryButton: { backgroundColor: colors.light.sky, minHeight: 44, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  secondaryButtonText: { color: colors.light.blue, fontFamily: 'Inter_700Bold', fontSize: 13 },
  ghostButton: { minHeight: 44, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, borderWidth: 1, borderColor: colors.light.border },
  ghostButtonText: { color: colors.light.navy, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickAction: { flex: 1, minHeight: 98, borderRadius: 18, padding: 13, justifyContent: 'space-between', borderWidth: 1 },
  quickIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: colors.light.navy, fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 16 },
  safetyBanner: { backgroundColor: colors.light.coralSoft, borderRadius: 20, padding: 15, flexDirection: 'row', gap: 12, alignItems: 'center' },
  safetyIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.light.coral, alignItems: 'center', justifyContent: 'center' },
  safetyTitle: { color: colors.light.navy, fontFamily: 'Inter_700Bold', fontSize: 13 },
  safetyBody: { color: colors.light.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 3 },
  safetyText: { flex: 1 },
  listCard: { backgroundColor: colors.light.white, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: colors.light.border, marginBottom: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.light.sky, alignItems: 'center', justifyContent: 'center' },
  listTitle: { color: colors.light.navy, fontFamily: 'Inter_700Bold', fontSize: 14 },
  listBody: { color: colors.light.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 3 },
  listContent: { flex: 1 },
  tag: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 100, backgroundColor: colors.light.muted },
  tagText: { color: colors.light.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  dayLabel: { color: colors.light.blue, fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  timeline: { marginTop: 11, paddingLeft: 3 },
  timelineItem: { flexDirection: 'row', gap: 12, minHeight: 73 },
  timelineRail: { width: 19, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 12, backgroundColor: colors.light.blue, borderWidth: 3, borderColor: colors.light.sky },
  timelineLine: { flex: 1, width: 1, backgroundColor: colors.light.border, marginTop: 3 },
  timelineContent: { flex: 1, paddingBottom: 18 },
  timelineTime: { color: colors.light.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 11 },
  timelineTitle: { color: colors.light.navy, fontFamily: 'Inter_700Bold', fontSize: 14, marginTop: 3 },
  timelineMeta: { color: colors.light.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3 },
  inputLabel: { color: colors.light.navy, fontFamily: 'Inter_600SemiBold', fontSize: 12, marginBottom: 8 },
  input: { height: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.light.border, backgroundColor: colors.light.white, paddingHorizontal: 15, color: colors.light.navy, fontFamily: 'Inter_500Medium', fontSize: 14, marginBottom: 17 },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputHalf: { flex: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 100, borderWidth: 1, borderColor: colors.light.border, backgroundColor: colors.light.white },
  chipActive: { backgroundColor: colors.light.navy, borderColor: colors.light.navy },
  chipText: { color: colors.light.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  chipTextActive: { color: colors.light.white },
  formHero: { backgroundColor: colors.light.navy, borderRadius: 24, padding: 20, marginTop: 22, marginBottom: 22 },
  formHeroTitle: { color: colors.light.white, fontFamily: 'Inter_700Bold', fontSize: 23, lineHeight: 29 },
  formHeroBody: { color: 'rgba(255,255,255,0.72)', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 7 },
  aiSpark: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', backgroundColor: colors.light.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.light.border },
  statValue: { color: colors.light.navy, fontFamily: 'Inter_700Bold', fontSize: 24 },
  statLabel: { color: colors.light.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 5 },
  metricAccent: { width: 8, height: 8, borderRadius: 8, backgroundColor: colors.light.green, marginBottom: 10 },
  roleCard: { backgroundColor: colors.light.white, borderRadius: 20, padding: 16, marginBottom: 11, borderWidth: 1, borderColor: colors.light.border, flexDirection: 'row', alignItems: 'center', gap: 13 },
  roleCardActive: { borderColor: colors.light.blue, backgroundColor: colors.light.sky },
  roleCardIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.light.muted, alignItems: 'center', justifyContent: 'center' },
  roleCardContent: { flex: 1 },
  roleName: { color: colors.light.navy, fontFamily: 'Inter_700Bold', fontSize: 14 },
  roleDescription: { color: colors.light.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3 },
  bottomNav: { flexDirection: 'row', backgroundColor: colors.light.white, borderTopWidth: 1, borderTopColor: colors.light.border, paddingHorizontal: 7, paddingTop: 9, paddingBottom: Platform.OS === 'web' ? 34 : 10, gap: 2 },
  navItem: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
  navItemActive: { backgroundColor: colors.light.sky, borderRadius: 14 },
  navText: { color: colors.light.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 10 },
  navTextActive: { color: colors.light.blue, fontFamily: 'Inter_700Bold' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,27,50,0.48)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.light.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 21, paddingBottom: 30, maxHeight: '88%' },
  modalHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 4, backgroundColor: colors.light.border, marginBottom: 19 },
  modalTitle: { color: colors.light.navy, fontFamily: 'Inter_700Bold', fontSize: 22 },
  modalBody: { color: colors.light.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 18 },
  modalActions: { flexDirection: 'row', gap: 9, marginTop: 16 },
  modalActionFlex: { flex: 1 },
  alertCard: { backgroundColor: colors.light.yellowSoft, borderRadius: 18, padding: 14, flexDirection: 'row', gap: 11, alignItems: 'center' },
  alertCardText: { flex: 1, color: colors.light.navy, fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 18 },
  optionCard: { backgroundColor: colors.light.white, borderRadius: 17, padding: 14, borderWidth: 1, borderColor: colors.light.border, marginBottom: 9 },
  optionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionTitle: { color: colors.light.navy, fontFamily: 'Inter_700Bold', fontSize: 14 },
  optionPrice: { color: colors.light.green, fontFamily: 'Inter_700Bold', fontSize: 14 },
  optionMeta: { color: colors.light.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 6 },
  progressRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 18 },
  progressIcon: { width: 27, height: 27, borderRadius: 10, backgroundColor: colors.light.greenSoft, alignItems: 'center', justifyContent: 'center' },
  progressTitle: { color: colors.light.navy, fontFamily: 'Inter_700Bold', fontSize: 13 },
  progressBody: { color: colors.light.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3, lineHeight: 16 },
  progressContent: { flex: 1 },
  toast: { position: 'absolute', left: 20, right: 20, minHeight: 48, borderRadius: 16, backgroundColor: colors.light.navy, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 15, shadowColor: colors.light.navy, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  toastText: { color: colors.light.white, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});

function TapButton({ label, icon, onPress, variant = 'primary', style, testID }: { label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost'; style?: object; testID?: string }) {
  const buttonStyle = variant === 'primary' ? styles.primaryButton : variant === 'secondary' ? styles.secondaryButton : styles.ghostButton;
  const textStyle = variant === 'primary' ? styles.primaryButtonText : variant === 'secondary' ? styles.secondaryButtonText : styles.ghostButtonText;
  return (
    <Pressable testID={testID ?? `button-${label.toLowerCase().replace(/\s+/g, '-')}`} onPress={onPress} style={({ pressed }) => [buttonStyle, style, pressed && styles.pressed]}>
      {icon ? <Ionicons name={icon} size={16} color={variant === 'primary' ? colors.light.white : variant === 'secondary' ? colors.light.blue : colors.light.navy} /> : null}
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
}

function StatusPill({ label, tone = 'green' }: { label: string; tone?: 'green' | 'yellow' | 'blue' | 'coral' }) {
  const toneMap = {
    green: { bg: colors.light.greenSoft, fg: colors.light.green, dot: colors.light.green },
    yellow: { bg: colors.light.yellowSoft, fg: '#9a6d10', dot: colors.light.yellow },
    blue: { bg: colors.light.sky, fg: colors.light.blue, dot: colors.light.blue },
    coral: { bg: colors.light.coralSoft, fg: '#a64e20', dot: colors.light.coral },
  }[tone];
  return (
    <View style={[styles.statusPill, { backgroundColor: toneMap.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: toneMap.dot }]} />
      <Text style={[styles.statusText, { color: toneMap.fg }]}>{label}</Text>
    </View>
  );
}

function SectionHeading({ title, link, onLink }: { title: string; link?: string; onLink?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {link && onLink ? <Pressable onPress={onLink}><Text style={styles.sectionLink}>{link}</Text></Pressable> : null}
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [section, setSection] = useState<Section>('home');
  const [modal, setModal] = useState<ModalKind>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [destination, setDestination] = useState('Lisbon, Portugal');
  const [dates, setDates] = useState('Sep 18 – 24, 2026');
  const [budget, setBudget] = useState('2,400');
  const [travelStyle, setTravelStyle] = useState('Balanced');

  const topPadding = Math.max(insets.top + 12, Platform.OS === 'web' ? 79 : 24);
  const currentRole = roleCopy[state.role];

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) setState({ ...initialState, ...JSON.parse(value) });
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  const saveState = (patch: Partial<AppState>) => {
    const next = { ...state, ...patch };
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  };

  const vibrate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const notify = (message: string) => {
    vibrate();
    setToast(message);
    setTimeout(() => setToast(null), 3200);
  };

  const selectRole = (role: Role) => {
    saveState({ role });
    setModal(null);
    setSection('home');
    notify(`${roleCopy[role].label} view ready`);
  };

  const generateItinerary = () => {
    saveState({ itineraryGenerated: true });
    setSection('trip');
    notify('Your AI itinerary is ready');
  };

  const heroTitle = useMemo(() => {
    if (state.role === 'traveler') return 'Good morning, Aastha';
    if (state.role === 'agent') return 'Good morning, Maya';
    return 'Good morning, Alex';
  }, [state.role]);

  if (!hydrated) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        {section === 'home' ? renderHome() : null}
        {section === 'trip' ? renderTrip() : null}
        {section === 'plan' ? renderPlan() : null}
        {section === 'support' ? renderSupport() : null}
        {section === 'profile' ? renderProfile() : null}
      </View>
      {renderBottomNav()}
      {toast ? (
        <Pressable onPress={() => setToast(null)} style={[styles.toast, { bottom: (Platform.OS === 'web' ? 100 : 75) + insets.bottom }]}>
          <Ionicons name="checkmark-circle" size={18} color={colors.light.white} />
          <Text style={styles.toastText}>{toast}</Text>
        </Pressable>
      ) : null}
      {renderModal()}
    </View>
  );

  function renderPage(children: React.ReactNode, scroll = true) {
    return scroll ? (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: topPadding }]}
      >
        {children}
      </ScrollView>
    ) : (
      <View style={[styles.content, { paddingTop: topPadding }]}>{children}</View>
    );
  }

  function renderHeader() {
    return (
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{currentRole.eyebrow}</Text>
          <Text style={styles.title}>{heroTitle}</Text>
          <Text style={styles.subtitle}>
            {state.role === 'traveler' ? 'Your journey is looking beautifully on track.' : state.role === 'agent' ? 'Three travelers need your attention today.' : 'Everything that matters, at a glance.'}
          </Text>
        </View>
        <Pressable testID="button-notifications" onPress={() => setModal('notifications')} style={styles.iconButton}>
          <Ionicons name="notifications-outline" size={21} color={colors.light.navy} />
          <View style={styles.notificationDot} />
        </Pressable>
        <Pressable onPress={() => setModal('role')} style={[styles.avatar, { marginLeft: 9 }]}>
          <Text style={styles.avatarText}>{state.role === 'traveler' ? 'AS' : state.role === 'agent' ? 'MK' : 'AD'}</Text>
        </Pressable>
      </View>
    );
  }

  function renderHome() {
    if (state.role === 'agent') return renderAgentHome();
    if (state.role === 'admin') return renderAdminHome();
    return renderPage(
      <>
        {renderHeader()}
        <ImageBackground source={require('../assets/images/coastal-road.jpg')} style={styles.hero} imageStyle={{ opacity: 0.92 }}>
          <LinearGradient colors={['transparent', 'rgba(23,35,61,0.94)']} style={styles.heroImage}>
            <View style={styles.heroGradient}>
              <Text style={styles.heroKicker}>Next up · Sep 18, 2026</Text>
              <Text style={styles.heroTitle}>A week of slow mornings in Lisbon</Text>
              <View style={styles.heroMeta}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.86)" />
                <Text style={styles.heroMetaText}>Lisbon · 7 days · 2 travelers</Text>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
        <View style={styles.section}>
          <View style={styles.tripCard}>
            <View style={styles.tripCardRow}>
              <View><Text style={styles.tripCardLabel}>Trip readiness</Text><Text style={styles.tripCardValue}>{state.booked ? 'Booked & ready' : 'Almost ready to book'}</Text></View>
              <StatusPill label={state.booked ? 'Confirmed' : '98% ready'} tone={state.booked ? 'green' : 'blue'} />
            </View>
            <View style={styles.tripCardDivider} />
            <View style={styles.tripCardBottom}>
              <View style={styles.nextStop}>
                <View style={styles.nextStopIcon}><Ionicons name="cafe-outline" size={17} color={colors.light.blue} /></View>
                <View><Text style={styles.nextStopText}>Breakfast at Nicolau</Text><Text style={styles.nextStopSubtext}>Day 1 · 9:30 AM · Reserved</Text></View>
              </View>
              <Pressable onPress={() => setSection('trip')}><Ionicons name="arrow-forward-circle" size={30} color={colors.light.blue} /></Pressable>
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <SectionHeading title="Make it yours" />
          <View style={styles.quickGrid}>
            <Pressable onPress={() => setSection('plan')} style={[styles.quickAction, { backgroundColor: colors.light.sky, borderColor: colors.light.sky }]}>
              <View style={[styles.quickIcon, { backgroundColor: colors.light.blue }]}><Ionicons name="sparkles" size={16} color={colors.light.white} /></View>
              <Text style={styles.quickLabel}>Plan a new escape</Text>
            </Pressable>
            <Pressable onPress={() => setModal('compare')} style={[styles.quickAction, { backgroundColor: colors.light.purpleSoft, borderColor: colors.light.purpleSoft }]}>
              <View style={[styles.quickIcon, { backgroundColor: colors.light.purple }]}><Ionicons name="git-compare-outline" size={16} color={colors.light.white} /></View>
              <Text style={styles.quickLabel}>Compare options</Text>
            </Pressable>
            <Pressable onPress={() => setModal('replan')} style={[styles.quickAction, { backgroundColor: colors.light.coralSoft, borderColor: colors.light.coralSoft }]}>
              <View style={[styles.quickIcon, { backgroundColor: colors.light.coral }]}><Ionicons name="shuffle-outline" size={16} color={colors.light.white} /></View>
              <Text style={styles.quickLabel}>Replan my trip</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.section}>
          <SectionHeading title="Your trip concierge" link="Open support" onLink={() => setSection('support')} />
          <View style={styles.safetyBanner}>
            <View style={styles.safetyIcon}><Ionicons name="shield-checkmark-outline" size={20} color={colors.light.white} /></View>
            <View style={styles.safetyText}><Text style={styles.safetyTitle}>You’re covered, wherever you go</Text><Text style={styles.safetyBody}>Our team can step in, replan, or replace an agent without interrupting your journey.</Text></View>
            <Pressable onPress={() => setModal('safety')}><Ionicons name="chevron-forward" size={18} color={colors.light.coral} /></Pressable>
          </View>
        </View>
        <View style={styles.section}>
          <SectionHeading title="AI trip pulse" />
          <View style={styles.listCard}>
            <View style={styles.listRow}>
              <View style={[styles.listIcon, { backgroundColor: colors.light.greenSoft }]}><Ionicons name="sparkles-outline" size={19} color={colors.light.green} /></View>
              <View style={styles.listContent}><Text style={styles.listTitle}>Everything is aligned</Text><Text style={styles.listBody}>Your hotel is 8 minutes from the first activity and stays within budget.</Text></View>
              <StatusPill label="Good" />
            </View>
          </View>
        </View>
      </>,
    );
  }

  function renderAgentHome() {
    return renderPage(
      <>
        {renderHeader()}
        <View style={[styles.formHero, { marginTop: 23, backgroundColor: colors.light.navy }]}>
          <View style={styles.aiSpark}><Ionicons name="briefcase" size={19} color={colors.light.white} /></View>
          <Text style={styles.formHeroTitle}>Your ground plan is ready.</Text>
          <Text style={styles.formHeroBody}>Keep the Lisbon handoff moving. One traveler request needs a vendor response by 2:00 PM.</Text>
          <TapButton label="Open assigned tour" icon="arrow-forward" onPress={() => setSection('trip')} style={{ alignSelf: 'flex-start', marginTop: 18, backgroundColor: colors.light.coral }} />
        </View>
        <View style={styles.section}>
          <SectionHeading title="Today at a glance" />
          <View style={styles.statGrid}>
            <View style={styles.statCard}><View style={[styles.metricAccent, { backgroundColor: colors.light.blue }]} /><Text style={styles.statValue}>03</Text><Text style={styles.statLabel}>Assigned tours</Text></View>
            <View style={styles.statCard}><View style={[styles.metricAccent, { backgroundColor: colors.light.coral }]} /><Text style={styles.statValue}>01</Text><Text style={styles.statLabel}>Needs attention</Text></View>
            <View style={styles.statCard}><View style={[styles.metricAccent, { backgroundColor: colors.light.green }]} /><Text style={styles.statValue}>14</Text><Text style={styles.statLabel}>Confirmed services</Text></View>
            <View style={styles.statCard}><View style={[styles.metricAccent, { backgroundColor: colors.light.purple }]} /><Text style={styles.statValue}>4.9</Text><Text style={styles.statLabel}>Traveler rating</Text></View>
          </View>
        </View>
        <View style={styles.section}>
          <SectionHeading title="Needs your attention" link="View all" onLink={() => setSection('support')} />
          <View style={styles.listCard}>
            <View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.coralSoft }]}><Ionicons name="swap-horizontal-outline" size={19} color={colors.light.coral} /></View><View style={styles.listContent}><Text style={styles.listTitle}>Hotel change request</Text><Text style={styles.listBody}>Aastha asked for a quieter room near Alfama.</Text></View><StatusPill label="New" tone="coral" /></View>
            <View style={styles.tripCardDivider} />
            <View style={styles.tripCardBottom}><Text style={styles.listBody}>Received 12 min ago</Text><TapButton label="Coordinate" onPress={() => setModal('replan')} variant="secondary" /></View>
          </View>
        </View>
        <View style={styles.section}>
          <SectionHeading title="Vendor confirmations" />
          <View style={styles.listCard}><View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.greenSoft }]}><Ionicons name="checkmark-done-outline" size={19} color={colors.light.green} /></View><View style={styles.listContent}><Text style={styles.listTitle}>Casa do Mercado · Hotel</Text><Text style={styles.listBody}>Confirmation received for Sep 18–24.</Text></View><StatusPill label="Confirmed" /></View></View>
          <View style={styles.listCard}><View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.yellowSoft }]}><Ionicons name="time-outline" size={19} color={colors.light.yellow} /></View><View style={styles.listContent}><Text style={styles.listTitle}>Tejo sunset sail · Activity</Text><Text style={styles.listBody}>Waiting on final availability check.</Text></View><StatusPill label="Pending" tone="yellow" /></View></View>
        </View>
      </>,
    );
  }

  function renderAdminHome() {
    return renderPage(
      <>
        {renderHeader()}
        <View style={[styles.formHero, { marginTop: 23, backgroundColor: colors.light.blue }]}>
          <View style={styles.aiSpark}><Ionicons name="shield-checkmark" size={19} color={colors.light.white} /></View>
          <Text style={styles.formHeroTitle}>The platform is moving well.</Text>
          <Text style={styles.formHeroBody}>128 travelers are currently supported across 34 active journeys.</Text>
          <TapButton label="Review live operations" icon="arrow-forward" onPress={() => setSection('trip')} style={{ alignSelf: 'flex-start', marginTop: 18, backgroundColor: colors.light.navy }} />
        </View>
        <View style={styles.section}>
          <SectionHeading title="Platform pulse" />
          <View style={styles.statGrid}>
            <View style={styles.statCard}><View style={[styles.metricAccent, { backgroundColor: colors.light.blue }]} /><Text style={styles.statValue}>128</Text><Text style={styles.statLabel}>Travelers</Text></View>
            <View style={styles.statCard}><View style={[styles.metricAccent, { backgroundColor: colors.light.green }]} /><Text style={styles.statValue}>34</Text><Text style={styles.statLabel}>Active tours</Text></View>
            <View style={styles.statCard}><View style={[styles.metricAccent, { backgroundColor: colors.light.purple }]} /><Text style={styles.statValue}>19</Text><Text style={styles.statLabel}>Tour agents</Text></View>
            <View style={styles.statCard}><View style={[styles.metricAccent, { backgroundColor: colors.light.coral }]} /><Text style={styles.statValue}>€42k</Text><Text style={styles.statLabel}>This month</Text></View>
          </View>
        </View>
        <View style={styles.section}>
          <SectionHeading title="Safety center" link="Open queue" onLink={() => setSection('support')} />
          <View style={[styles.listCard, { backgroundColor: state.issueRaised ? colors.light.coralSoft : colors.light.white }]}>
            <View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: state.issueRaised ? colors.light.coral : colors.light.greenSoft }]}><Ionicons name={state.issueRaised ? 'warning-outline' : 'shield-checkmark-outline'} size={19} color={state.issueRaised ? colors.light.white : colors.light.green} /></View><View style={styles.listContent}><Text style={styles.listTitle}>{state.issueRaised ? 'Agent replacement in progress' : 'No active emergencies'}</Text><Text style={styles.listBody}>{state.issueRaised ? 'Aastha’s Lisbon journey has been transferred to Leo Martins.' : 'All travelers have a clear support path.'}</Text></View><StatusPill label={state.issueRaised ? 'Active' : 'Clear'} tone={state.issueRaised ? 'coral' : 'green'} /></View>
          </View>
        </View>
        <View style={styles.section}>
          <SectionHeading title="Agent performance" />
          <View style={styles.listCard}><View style={styles.listRow}><View style={styles.avatar}><Text style={styles.avatarText}>LM</Text></View><View style={styles.listContent}><Text style={styles.listTitle}>Leo Martins</Text><Text style={styles.listBody}>18 tours · 4.98 average rating</Text></View><Ionicons name="trending-up-outline" size={20} color={colors.light.green} /></View></View>
          <View style={styles.listCard}><View style={styles.listRow}><View style={[styles.avatar, { backgroundColor: colors.light.coral }]}><Text style={styles.avatarText}>MK</Text></View><View style={styles.listContent}><Text style={styles.listTitle}>Maya Kapoor</Text><Text style={styles.listBody}>14 tours · 4.86 average rating</Text></View><Ionicons name="trending-up-outline" size={20} color={colors.light.green} /></View></View>
        </View>
      </>,
    );
  }

  function renderTrip() {
    if (state.role === 'agent') return renderAgentTrip();
    if (state.role === 'admin') return renderAdminTrip();
    return renderPage(
      <>
        <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.eyebrow}>September 18 – 24, 2026</Text><Text style={styles.title}>Lisbon, Portugal</Text><Text style={styles.subtitle}>Your plan adapts as the journey unfolds.</Text></View><StatusPill label={state.booked ? 'Booked' : 'Draft'} tone={state.booked ? 'green' : 'blue'} /></View>
        {!state.itineraryGenerated ? (
          <View style={[styles.tripCard, { marginTop: 23, alignItems: 'center', paddingVertical: 30 }]}><View style={[styles.quickIcon, { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.light.sky }]}><Ionicons name="sparkles" size={23} color={colors.light.blue} /></View><Text style={[styles.listTitle, { marginTop: 14 }]}>Your itinerary is waiting</Text><Text style={[styles.listBody, { textAlign: 'center', marginTop: 6 }]}>Tell us what makes a trip feel like yours, and the AI planner will do the rest.</Text><TapButton label="Generate itinerary" icon="sparkles-outline" onPress={() => setSection('plan')} style={{ marginTop: 18 }} /></View>
        ) : (
          <>
            <View style={[styles.tripCard, { marginTop: 23 }]}>
              <View style={styles.tripCardRow}><View><Text style={styles.tripCardLabel}>AI plan confidence</Text><Text style={styles.tripCardValue}>96% match to your style</Text></View><View style={[styles.quickIcon, { backgroundColor: colors.light.purpleSoft }]}><Ionicons name="sparkles" size={18} color={colors.light.purple} /></View></View>
              <View style={styles.tripCardDivider} />
              <View style={styles.tripCardBottom}><Text style={styles.listBody}>€2,184 estimated total</Text><Text style={styles.listBody}>8h 20m in transit</Text></View>
            </View>
            <View style={styles.section}><SectionHeading title="Day 1 · Arrival & settle in" /><View style={styles.timeline}>
              {[
                ['11:40 AM', 'Land at Humberto Delgado', 'Private transfer · 24 min to hotel'],
                ['1:00 PM', 'Check in at Casa do Mercado', 'Boutique hotel · Alfama'],
                ['6:30 PM', 'Golden hour in Miradouro', 'Easy walk · Reserved table nearby'],
              ].map(([time, title, meta], index) => <View style={styles.timelineItem} key={title}><View style={styles.timelineRail}><View style={styles.timelineDot} />{index < 2 ? <View style={styles.timelineLine} /> : null}</View><View style={styles.timelineContent}><Text style={styles.timelineTime}>{time}</Text><Text style={styles.timelineTitle}>{title}</Text><Text style={styles.timelineMeta}>{meta}</Text></View></View>)}
            </View></View>
            <View style={styles.section}><SectionHeading title="Day 2 · Local rhythm" /><View style={styles.listCard}><View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.coralSoft }]}><Ionicons name="restaurant-outline" size={19} color={colors.light.coral} /></View><View style={styles.listContent}><Text style={styles.listTitle}>Food walk through Mouraria</Text><Text style={styles.listBody}>11:00 AM · 3.2 km · Small group</Text></View><StatusPill label="Reserved" /></View></View><View style={styles.listCard}><View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.purpleSoft }]}><Ionicons name="boat-outline" size={19} color={colors.light.purple} /></View><View style={styles.listContent}><Text style={styles.listTitle}>Tejo sunset sail</Text><Text style={styles.listBody}>5:30 PM · 2 hours · Weather checked</Text></View><StatusPill label="Flexible" tone="blue" /></View></View></View>
            <View style={styles.section}><View style={styles.quickGrid}><TapButton label="Customize" icon="options-outline" onPress={() => setSection('plan')} variant="secondary" style={{ flex: 1 }} /><TapButton label="Compare" icon="git-compare-outline" onPress={() => setModal('compare')} variant="ghost" style={{ flex: 1 }} /><TapButton label={state.booked ? 'Paid' : 'Book & pay'} icon={state.booked ? 'checkmark-circle-outline' : 'card-outline'} onPress={() => { saveState({ booked: true }); notify('Trip confirmed — payment secured'); }} style={{ flex: 1 }} /></View></View>
          </>
        )}
      </>,
    );
  }

  function renderAgentTrip() {
    return renderPage(
      <>
        <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.eyebrow}>Assigned tour · T-2048</Text><Text style={styles.title}>Aastha in Lisbon</Text><Text style={styles.subtitle}>Sep 18 – 24 · 2 travelers · Maya Kapoor</Text></View><StatusPill label={state.agentConfirmed ? 'On track' : 'Action needed'} tone={state.agentConfirmed ? 'green' : 'yellow'} /></View>
        <View style={[styles.tripCard, { marginTop: 23 }]}><View style={styles.tripCardRow}><View><Text style={styles.tripCardLabel}>Traveler preferences</Text><Text style={styles.tripCardValue}>Slow pace · Food · Local stays</Text></View><View style={[styles.quickIcon, { backgroundColor: colors.light.sky }]}><Ionicons name="heart-outline" size={18} color={colors.light.blue} /></View></View><View style={styles.tripCardDivider} /><View style={styles.tripCardBottom}><Text style={styles.listBody}>Budget €2,400</Text><Text style={styles.listBody}>Allergies: none</Text></View></View>
        <View style={styles.section}><SectionHeading title="Execution checklist" /><View style={styles.listCard}><View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.greenSoft }]}><Ionicons name="bed-outline" size={19} color={colors.light.green} /></View><View style={styles.listContent}><Text style={styles.listTitle}>Casa do Mercado</Text><Text style={styles.listBody}>Hotel · Sep 18–24 · 1 room</Text></View><StatusPill label="Confirmed" /></View></View><View style={styles.listCard}><View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.yellowSoft }]}><Ionicons name="boat-outline" size={19} color={colors.light.yellow} /></View><View style={styles.listContent}><Text style={styles.listTitle}>Tejo sunset sail</Text><Text style={styles.listBody}>Activity · Sep 19 · 5:30 PM</Text></View><StatusPill label="Pending" tone="yellow" /></View></View><View style={styles.listCard}><View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.sky }]}><Ionicons name="car-outline" size={19} color={colors.light.blue} /></View><View style={styles.listContent}><Text style={styles.listTitle}>Airport transfer</Text><Text style={styles.listBody}>Transport · Sep 18 · 11:40 AM</Text></View><StatusPill label="Confirmed" /></View></View></View>
        <View style={styles.section}><TapButton label={state.agentConfirmed ? 'Tour confirmed' : 'Confirm booking' } icon={state.agentConfirmed ? 'checkmark-circle' : 'checkmark-done-outline'} onPress={() => { saveState({ agentConfirmed: true }); notify('Traveler and vendors updated'); }} style={{ width: '100%' }} /><TapButton label="Handle change request" icon="shuffle-outline" onPress={() => setModal('replan')} variant="secondary" style={{ width: '100%', marginTop: 10 }} /></View>
      </>,
    );
  }

  function renderAdminTrip() {
    return renderPage(
      <>
        <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.eyebrow}>Live operations · Sep 2026</Text><Text style={styles.title}>Tour status</Text><Text style={styles.subtitle}>A clear view of journeys, vendors, and interventions.</Text></View><StatusPill label="Live" /></View>
        <View style={styles.section}><SectionHeading title="Active journeys" /><View style={styles.listCard}><View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.greenSoft }]}><Ionicons name="airplane-outline" size={19} color={colors.light.green} /></View><View style={styles.listContent}><Text style={styles.listTitle}>Lisbon · Aastha Gupta</Text><Text style={styles.listBody}>Agent Maya Kapoor · 96% itinerary match</Text></View><StatusPill label="On track" /></View></View><View style={styles.listCard}><View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.sky }]}><Ionicons name="airplane-outline" size={19} color={colors.light.blue} /></View><View style={styles.listContent}><Text style={styles.listTitle}>Kyoto · Noah Williams</Text><Text style={styles.listBody}>Agent Leo Martins · Day 4 of 8</Text></View><StatusPill label="Moving" tone="blue" /></View></View><View style={styles.listCard}><View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.coralSoft }]}><Ionicons name="warning-outline" size={19} color={colors.light.coral} /></View><View style={styles.listContent}><Text style={styles.listTitle}>Reykjavík · Priya Shah</Text><Text style={styles.listBody}>Hotel disruption · AI alternatives ready</Text></View><StatusPill label="Review" tone="coral" /></View></View></View>
        <View style={styles.section}><SectionHeading title="Control room actions" /><View style={styles.quickGrid}><Pressable onPress={() => setModal('safety')} style={[styles.quickAction, { backgroundColor: colors.light.coralSoft, borderColor: colors.light.coralSoft }]}><View style={[styles.quickIcon, { backgroundColor: colors.light.coral }]}><Ionicons name="shield-outline" size={16} color={colors.light.white} /></View><Text style={styles.quickLabel}>Review safety queue</Text></Pressable><Pressable onPress={() => setModal('replan')} style={[styles.quickAction, { backgroundColor: colors.light.purpleSoft, borderColor: colors.light.purpleSoft }]}><View style={[styles.quickIcon, { backgroundColor: colors.light.purple }]}><Ionicons name="analytics-outline" size={16} color={colors.light.white} /></View><Text style={styles.quickLabel}>Inspect AI replan</Text></Pressable></View></View>
      </>,
    );
  }

  function renderPlan() {
    return renderPage(
      <KeyboardAwareScrollViewCompat contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.eyebrow}>AI planning engine</Text><Text style={styles.title}>Design your next escape</Text><Text style={styles.subtitle}>A few thoughtful details help us make every handoff feel effortless.</Text></View><View style={[styles.quickIcon, { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.light.purpleSoft }]}><Ionicons name="sparkles" size={21} color={colors.light.purple} /></View></View>
        <View style={styles.formHero}><View style={styles.aiSpark}><Ionicons name="sparkles" size={19} color={colors.light.white} /></View><Text style={styles.formHeroTitle}>A plan that bends, not breaks.</Text><Text style={styles.formHeroBody}>We’ll balance your preferences, budget, distance, weather, and real-time availability.</Text></View>
        <Text style={styles.inputLabel}>Where are you going?</Text><TextInput testID="input-destination" value={destination} onChangeText={setDestination} placeholder="e.g. Kyoto, Japan" placeholderTextColor={colors.light.mutedForeground} style={styles.input} />
        <View style={styles.inputRow}><View style={styles.inputHalf}><Text style={styles.inputLabel}>Dates</Text><TextInput value={dates} onChangeText={setDates} placeholder="Add dates" placeholderTextColor={colors.light.mutedForeground} style={styles.input} /></View><View style={styles.inputHalf}><Text style={styles.inputLabel}>Budget (€)</Text><TextInput value={budget} onChangeText={setBudget} keyboardType={'numeric' as KeyboardTypeOptions} placeholder="2,400" placeholderTextColor={colors.light.mutedForeground} style={styles.input} /></View></View>
        <Text style={styles.inputLabel}>Travel style</Text><View style={styles.chipWrap}>{['Balanced', 'Slow & local', 'Adventure', 'Design stays'].map((chip) => <Pressable key={chip} onPress={() => setTravelStyle(chip)} style={[styles.chip, travelStyle === chip && styles.chipActive]}><Text style={[styles.chipText, travelStyle === chip && styles.chipTextActive]}>{chip}</Text></Pressable>)}</View>
        <Text style={styles.inputLabel}>What do you want more of?</Text><View style={styles.chipWrap}>{['Food', 'Architecture', 'Nature', 'Wellness', 'Nightlife'].map((chip, index) => <Pressable key={chip} onPress={() => notify(`${chip} added to your preferences`)} style={[styles.chip, index < 2 && { backgroundColor: colors.light.sky, borderColor: colors.light.sky }]}><Text style={[styles.chipText, index < 2 && { color: colors.light.blue }]}>{chip}</Text></Pressable>)}</View>
        <TapButton testID="button-generate-itinerary" label="Generate my itinerary" icon="sparkles-outline" onPress={generateItinerary} style={{ width: '100%' }} />
      </KeyboardAwareScrollViewCompat>,
    );
  }

  function renderSupport() {
    const issue = state.issueRaised;
    return renderPage(
      <>
        <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.eyebrow}>Always-on support</Text><Text style={styles.title}>Your trip concierge</Text><Text style={styles.subtitle}>A human-ready safety net behind every AI recommendation.</Text></View><View style={[styles.quickIcon, { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.light.coralSoft }]}><Ionicons name="heart" size={20} color={colors.light.coral} /></View></View>
        <View style={[styles.safetyBanner, { marginTop: 24, backgroundColor: issue ? colors.light.greenSoft : colors.light.coralSoft }]}><View style={[styles.safetyIcon, { backgroundColor: issue ? colors.light.green : colors.light.coral }]}><Ionicons name={issue ? 'checkmark' : 'shield-checkmark-outline'} size={20} color={colors.light.white} /></View><View style={styles.safetyText}><Text style={styles.safetyTitle}>{issue ? 'Support has taken over' : 'Need a human right now?'}</Text><Text style={styles.safetyBody}>{issue ? 'Your tour was transferred without losing your bookings or preferences.' : 'Raise a complaint or emergency and our operations team will protect your journey.'}</Text></View></View>
        <View style={styles.section}><SectionHeading title="What can we help with?" /><Pressable onPress={() => setModal('replan')} style={styles.listCard}><View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.purpleSoft }]}><Ionicons name="shuffle-outline" size={19} color={colors.light.purple} /></View><View style={styles.listContent}><Text style={styles.listTitle}>Change or replan my itinerary</Text><Text style={styles.listBody}>We’ll compare time, cost, and comfort before asking you to approve.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.light.mutedForeground} /></View></Pressable><Pressable onPress={() => setModal('safety')} style={styles.listCard}><View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.coralSoft }]}><Ionicons name="warning-outline" size={19} color={colors.light.coral} /></View><View style={styles.listContent}><Text style={styles.listTitle}>Raise complaint / emergency</Text><Text style={styles.listBody}>Escalate an agent issue to the admin safety center.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.light.mutedForeground} /></View></Pressable><Pressable onPress={() => notify('A concierge will call you in under 5 minutes')} style={styles.listCard}><View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.sky }]}><Ionicons name="call-outline" size={19} color={colors.light.blue} /></View><View style={styles.listContent}><Text style={styles.listTitle}>Talk to a concierge</Text><Text style={styles.listBody}>Get help with a booking, vendor, or local question.</Text></View><Ionicons name="chevron-forward" size={18} color={colors.light.mutedForeground} /></View></Pressable></View>
        {issue ? <View style={styles.section}><SectionHeading title="Resolution timeline" /><View style={styles.tripCard}><ProgressRow icon="checkmark" title="Issue received" body="Admin safety center notified · 10:42 AM" /><ProgressRow icon="checkmark" title="New agent assigned" body="Leo Martins has the full itinerary and vendor context" /><ProgressRow icon="checkmark" title="Journey continues" body="Traveler notified · bookings remain intact" /></View></View> : null}
      </>,
    );
  }

  function ProgressRow({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
    return <View style={styles.progressRow}><View style={styles.progressIcon}><Ionicons name={icon} size={15} color={colors.light.green} /></View><View style={styles.progressContent}><Text style={styles.progressTitle}>{title}</Text><Text style={styles.progressBody}>{body}</Text></View></View>;
  }

  function renderProfile() {
    return renderPage(
      <>
        <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.eyebrow}>Account & workspace</Text><Text style={styles.title}>Your profile</Text><Text style={styles.subtitle}>Switch perspectives to explore the complete orchestration flow.</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>{state.role === 'traveler' ? 'AS' : state.role === 'agent' ? 'MK' : 'AD'}</Text></View></View>
        <View style={[styles.tripCard, { marginTop: 23 }]}><View style={styles.tripCardRow}><View><Text style={styles.tripCardLabel}>Signed in as</Text><Text style={styles.tripCardValue}>{state.role === 'traveler' ? 'Aastha Gupta' : state.role === 'agent' ? 'Maya Kapoor' : 'Alex Davis'}</Text></View><StatusPill label={currentRole.label} tone="blue" /></View><View style={styles.tripCardDivider} /><View style={styles.tripCardBottom}><Text style={styles.listBody}>{state.role === 'traveler' ? 'Traveler account' : state.role === 'agent' ? 'Lisbon · Europe team' : 'Operations · Global'}</Text><Pressable onPress={() => setModal('role')}><Text style={styles.sectionLink}>Switch view</Text></Pressable></View></View>
        <View style={styles.section}><SectionHeading title="Safety promise" /><View style={styles.listCard}><View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.greenSoft }]}><Ionicons name="lock-closed-outline" size={19} color={colors.light.green} /></View><View style={styles.listContent}><Text style={styles.listTitle}>Your journey never starts over</Text><Text style={styles.listBody}>If something goes wrong, itinerary, bookings, preferences, and location context transfer securely to a new agent.</Text></View></View></View></View>
        <View style={styles.section}><SectionHeading title="Demo roles" />{(['traveler', 'agent', 'admin'] as Role[]).map((role) => <Pressable key={role} onPress={() => selectRole(role)} style={[styles.roleCard, state.role === role && styles.roleCardActive]}><View style={styles.roleCardIcon}><Ionicons name={roleCopy[role].icon} size={20} color={state.role === role ? colors.light.blue : colors.light.mutedForeground} /></View><View style={styles.roleCardContent}><Text style={styles.roleName}>{roleCopy[role].label}</Text><Text style={styles.roleDescription}>{role === 'traveler' ? 'Plan, book, track, and get help.' : role === 'agent' ? 'Coordinate vendors and keep tours moving.' : 'Monitor the platform and resolve safety issues.'}</Text></View>{state.role === role ? <Ionicons name="checkmark-circle" size={21} color={colors.light.blue} /> : <Ionicons name="chevron-forward" size={18} color={colors.light.mutedForeground} />}</Pressable>)}</View>
      </>,
    );
  }

  function renderBottomNav() {
    return <View style={styles.bottomNav}>{navItems.map((item) => <Pressable key={item.key} testID={`nav-${item.key}`} onPress={() => setSection(item.key)} style={[styles.navItem, section === item.key && styles.navItemActive]}><Ionicons name={item.icon} size={20} color={section === item.key ? colors.light.blue : colors.light.mutedForeground} /><Text style={[styles.navText, section === item.key && styles.navTextActive]}>{item.key === 'trip' && state.role === 'admin' ? 'Live' : item.key === 'trip' && state.role === 'agent' ? 'Tours' : item.label}</Text></Pressable>)}</View>;
  }

  function renderModal() {
    if (!modal) return null;
    return (
      <Modal visible animationType="slide" transparent onRequestClose={() => setModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            {modal === 'role' ? renderRoleModal() : null}
            {modal === 'compare' ? renderCompareModal() : null}
            {modal === 'safety' ? renderSafetyModal() : null}
            {modal === 'replan' ? renderReplanModal() : null}
            {modal === 'notifications' ? renderNotificationsModal() : null}
          </View>
        </View>
      </Modal>
    );
  }

  function renderRoleModal() {
    return <><Text style={styles.modalTitle}>Choose your view</Text><Text style={styles.modalBody}>Explore how the same journey stays connected across every role.</Text>{(['traveler', 'agent', 'admin'] as Role[]).map((role) => <Pressable key={role} onPress={() => selectRole(role)} style={[styles.roleCard, state.role === role && styles.roleCardActive]}><View style={styles.roleCardIcon}><Ionicons name={roleCopy[role].icon} size={20} color={colors.light.blue} /></View><View style={styles.roleCardContent}><Text style={styles.roleName}>{roleCopy[role].label}</Text><Text style={styles.roleDescription}>{role === 'traveler' ? 'Your personalized trip companion' : role === 'agent' ? 'Your assigned tours and vendor desk' : 'Live platform operations and safety'}</Text></View>{state.role === role ? <Ionicons name="checkmark-circle" size={21} color={colors.light.blue} /> : null}</Pressable>)}<TapButton label="Close" onPress={() => setModal(null)} variant="ghost" style={{ marginTop: 5 }} /></>;
  }

  function renderCompareModal() {
    return <><Text style={styles.modalTitle}>Compare alternatives</Text><Text style={styles.modalBody}>The AI found two options that keep your trip within budget.</Text><View style={styles.optionCard}><View style={styles.optionTop}><Text style={styles.optionTitle}>Casa do Mercado · Alfama</Text><Text style={styles.optionPrice}>€2,184</Text></View><Text style={styles.optionMeta}>Best preference match · 8 min walk to first activity · Quiet courtyard room</Text><View style={{ marginTop: 11 }}><StatusPill label="Recommended" /></View></View><View style={styles.optionCard}><View style={styles.optionTop}><Text style={styles.optionTitle}>The Lumiares · Bairro Alto</Text><Text style={styles.optionPrice}>€2,398</Text></View><Text style={styles.optionMeta}>More central · 14 min walk · Breakfast included · Slightly livelier</Text><View style={{ marginTop: 11 }}><StatusPill label="More central" tone="blue" /></View></View><View style={styles.modalActions}><TapButton label="Keep current" onPress={() => setModal(null)} variant="ghost" style={styles.modalActionFlex} /><TapButton label="Use recommended" icon="checkmark" onPress={() => { setModal(null); notify('Recommended option saved'); }} style={styles.modalActionFlex} /></View></>;
  }

  function renderSafetyModal() {
    if (state.issueRaised) return <><Text style={styles.modalTitle}>You’re not alone</Text><Text style={styles.modalBody}>The safety flow is active. Your journey context has already been transferred to a new agent.</Text><ProgressRow icon="checkmark" title="Admin notification sent" body="The operations team acknowledged your report." /><ProgressRow icon="checkmark" title="Leo Martins assigned" body="He has your bookings, preferences, and live location." /><ProgressRow icon="checkmark" title="Journey continues safely" body="No need to restart or rebook anything." /><TapButton label="Back to support" icon="arrow-forward" onPress={() => setModal(null)} style={{ width: '100%', marginTop: 4 }} /></>;
    return <><Text style={styles.modalTitle}>How can we help?</Text><Text style={styles.modalBody}>This goes straight to the admin safety center. We’ll preserve your complete tour context.</Text><View style={styles.alertCard}><Ionicons name="shield-checkmark-outline" size={19} color="#9a6d10" /><Text style={styles.alertCardText}>Your itinerary, bookings, preferences, and location are protected through the handoff.</Text></View><View style={styles.modalActions}><TapButton label="Raise complaint" icon="chatbubble-ellipses-outline" onPress={() => { saveState({ issueRaised: true }); setModal(null); setSection('support'); notify('Admin safety center notified'); }} variant="secondary" style={styles.modalActionFlex} /><TapButton label="Emergency" icon="warning-outline" onPress={() => { saveState({ issueRaised: true }); setModal(null); setSection('support'); notify('Emergency support activated'); }} style={[styles.modalActionFlex, { backgroundColor: colors.light.coral }]} /></View><TapButton label="Cancel" onPress={() => setModal(null)} variant="ghost" style={{ marginTop: 9 }} /></>;
  }

  function renderReplanModal() {
    if (state.replanApproved) return <><Text style={styles.modalTitle}>Plan updated</Text><Text style={styles.modalBody}>The conflict is resolved and everyone has the latest version.</Text><ProgressRow icon="checkmark" title="Delay detected" body="Tejo sailing moved by 45 minutes due to wind." /><ProgressRow icon="checkmark" title="Best alternative selected" body="The AI protected your dinner reservation and kept the cost flat." /><ProgressRow icon="checkmark" title="All parties notified" body="Traveler, agent, and vendors are aligned." /><TapButton label="View updated trip" icon="arrow-forward" onPress={() => { setModal(null); setSection('trip'); }} style={{ width: '100%', marginTop: 4 }} /></>;
    return <><Text style={styles.modalTitle}>A change was detected</Text><Text style={styles.modalBody}>Your 5:30 PM sailing moved because of wind. We checked the ripple effect across the rest of your day.</Text><View style={styles.alertCard}><Ionicons name="sparkles-outline" size={19} color="#9a6d10" /><Text style={styles.alertCardText}>Best match: move sailing to 6:15 PM, keep your table, add €0 to the trip.</Text></View><View style={{ marginTop: 18 }}><Text style={styles.dayLabel}>AI impact analysis</Text><View style={{ marginTop: 12 }}><ProgressRow icon="checkmark" title="Availability checked" body="3 sailings · 2 restaurants · 1 transfer" /><ProgressRow icon="checkmark" title="Preferences protected" body="No late-night transfer or extra walking added" /></View></View><View style={styles.modalActions}><TapButton label="Review options" onPress={() => setModal('compare')} variant="ghost" style={styles.modalActionFlex} /><TapButton label="Approve change" icon="checkmark" onPress={() => { saveState({ replanApproved: true }); notify('Everyone has the updated plan'); }} style={styles.modalActionFlex} /></View></>;
  }

  function renderNotificationsModal() {
    return <><Text style={styles.modalTitle}>Updates</Text><Text style={styles.modalBody}>The important things, without the noise.</Text><View style={styles.listCard}><View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.greenSoft }]}><Ionicons name="checkmark-done-outline" size={19} color={colors.light.green} /></View><View style={styles.listContent}><Text style={styles.listTitle}>Hotel confirmed</Text><Text style={styles.listBody}>Casa do Mercado is ready for Sep 18–24.</Text></View><Text style={styles.tagText}>Now</Text></View></View><View style={styles.listCard}><View style={styles.listRow}><View style={[styles.listIcon, { backgroundColor: colors.light.purpleSoft }]}><Ionicons name="sparkles-outline" size={19} color={colors.light.purple} /></View><View style={styles.listContent}><Text style={styles.listTitle}>AI found a better route</Text><Text style={styles.listBody}>12 minutes saved on your Day 2 plan.</Text></View><Text style={styles.tagText}>1h</Text></View></View><TapButton label="Mark all as read" onPress={() => { setModal(null); notify('All caught up'); }} variant="ghost" style={{ marginTop: 4 }} /></>;
  }
}
