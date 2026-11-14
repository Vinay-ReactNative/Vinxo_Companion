import { StyleSheet } from "react-native";

export const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#050505',
    },

    scrollContent: {
      flexGrow: 1,
    },

    content: {
      alignItems: 'center',
      paddingHorizontal: 22,
      paddingTop: 36,
      paddingBottom: 50,
    },

    title: {
      color: '#F5F5F5',
      fontSize: 34,
      fontWeight: '900',
      letterSpacing: 8,
    },

    subtitle: {
      color: '#777',
      fontSize: 11,
      letterSpacing: 3,
      marginTop: 6,
    },

    pipelineCard: {
      width: '100%',
      marginTop: 26,
      padding: 18,
      borderRadius: 18,
      backgroundColor: '#101010',
      borderWidth: 1,
      borderColor: '#292929',
    },

    pipeline: {
      color: '#EAEAEA',
      fontSize: 13,
      fontWeight: '700',
      marginTop: 12,
      lineHeight: 24,
    },

    card: {
      width: '100%',
      marginTop: 14,
      padding: 18,
      borderRadius: 18,
      backgroundColor: '#101010',
      borderWidth: 1,
      borderColor: '#242424',
    },

    cardTitle: {
      color: '#EAEAEA',
      fontSize: 17,
      fontWeight: '800',
      marginBottom: 14,
    },

    cardLabel: {
      color: '#777',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 2,
    },

    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 7,
    },

    statusLabel: {
      color: '#A0A0A0',
      fontSize: 14,
    },

    statusValue: {
      color: '#777',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
    },

    ready: {
      color: '#65D68A',
    },

    statusCard: {
      width: '100%',
      marginTop: 16,
      paddingVertical: 24,
      paddingHorizontal: 18,
      borderRadius: 20,
      backgroundColor: '#151515',
      borderWidth: 1,
      borderColor: '#303030',
      alignItems: 'center',
    },

    statusBig: {
      color: '#F5F5F5',
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },

    statusSmall: {
      color: '#777',
      fontSize: 13,
      marginTop: 7,
      textAlign: 'center',
    },

    outputText: {
      color: '#F1F1F1',
      fontSize: 18,
      lineHeight: 27,
      marginTop: 12,
    },

    placeholder: {
      color: '#555',
    },

    commandText: {
      color: '#D9D9D9',
      fontSize: 17,
      fontWeight: '700',
      marginTop: 10,
    },

    responseCard: {
      width: '100%',
      marginTop: 14,
      padding: 18,
      borderRadius: 18,
      backgroundColor: '#111614',
      borderWidth: 1,
      borderColor: '#294233',
    },

    responseText: {
      color: '#E8FFF0',
      fontSize: 19,
      lineHeight: 29,
      fontWeight: '700',
      marginTop: 12,
    },

    errorCard: {
      width: '100%',
      marginTop: 14,
      padding: 16,
      borderRadius: 16,
      backgroundColor: '#241010',
      borderWidth: 1,
      borderColor: '#5A2424',
    },

    errorTitle: {
      color: '#FF7777',
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 2,
      marginBottom: 8,
    },

    errorText: {
      color: '#FFB0B0',
      fontSize: 14,
      lineHeight: 21,
    },

    mainButton: {
      width: '100%',
      marginTop: 18,
      paddingVertical: 17,
      borderRadius: 16,
      backgroundColor: '#E5E5E5',
      alignItems: 'center',
    },

    stopButton: {
      backgroundColor: '#D84A4A',
    },

    mainButtonText: {
      color: '#050505',
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 1.5,
    },

    secondaryButton: {
      width: '100%',
      marginTop: 16,
      paddingVertical: 15,
      borderRadius: 16,
      backgroundColor: '#171717',
      borderWidth: 1,
      borderColor: '#383838',
      alignItems: 'center',
    },

    secondaryButtonText: {
      color: '#DADADA',
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 1,
    },

    buttonDisabled: {
      opacity: 0.45,
    },

    noteCard: {
      width: '100%',
      marginTop: 18,
      padding: 18,
      borderRadius: 18,
      backgroundColor: '#0D0D0D',
      borderWidth: 1,
      borderColor: '#252525',
    },

    noteTitle: {
      color: '#EAEAEA',
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 12,
    },

    noteText: {
      color: '#777',
      fontSize: 13,
      lineHeight: 21,
      marginBottom: 8,
    },

    testCommand: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 14,
    },
  });