import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Text } from 'react-native';


interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  options: DropdownOption[];
  selectedValue: string;
  onValueChange: (itemValue: string) => void;
  placeholder?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ options, selectedValue, onValueChange, placeholder }) => {
  const [visible, setVisible] = useState(false);

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || placeholder || 'Select...';

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={openMenu} style={styles.button}>
        <Text style={styles.buttonLabel}>{selectedLabel}</Text>
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={visible}
        onRequestClose={closeMenu}
      >
        <TouchableOpacity style={styles.overlay} onPress={closeMenu}>
          <View style={styles.dropdown}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.menuItem}
                onPress={() => {
                  onValueChange(option.value);
                  closeMenu();
                }}
              >
                <Text style={styles.menuItemText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  button: {
    height: 50,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: 'white',
    paddingHorizontal: 10,
  },
  buttonLabel: {
    fontSize: 16,
    color: 'black',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dropdown: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 8,
    maxHeight: '50%',
    overflow: 'hidden',
  },
  menuItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemText: {
    fontSize: 16,
    color: 'black',
  },
});

export default Dropdown;
