import { View, Button, Alert } from 'react-native';
import { isAssistantRoleHeld, requestAssistantRole } from '../native/VinxoAssistant';


const AssistantRoleTest = () => {

  const checkRole = async () => {
  try {
    const isHeld = await isAssistantRoleHeld();

    console.log('VINXO ASSISTANT ROLE:', isHeld);
    Alert.alert(
      'Assistant status',
      isHeld ? 'VINXO is selected as your assistant.' : 'VINXO is not selected as your assistant.',
    );
  } catch (error) {
    console.log('ASSISTANT CHECK ERROR:', error);
    Alert.alert('Assistant check failed', String(error));
  }
};

  const requestRole = async () => {
  try {
    const granted = await requestAssistantRole();

    console.log('ASSISTANT ROLE RESULT:', granted);
    Alert.alert(
      granted ? 'VINXO selected' : 'VINXO not selected',
      granted
        ? 'VINXO is now your assistant.'
        : 'Choose VINXO in Assist & voice input settings, then return to the app.',
    );
  } catch (error) {
    console.log('ASSISTANT REQUEST ERROR:', error);
    Alert.alert('Assistant selection failed', String(error));
  }
};

  return (
    <View style={{ padding: 20, gap: 15 }}>
      <Button title="Check Assistant Role" onPress={checkRole} />
      <Button title="Set VINXO as Assistant" onPress={requestRole} />
    </View>
  );
};

export default AssistantRoleTest;