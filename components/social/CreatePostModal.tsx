import { Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type CreatePostModalProps = {
 visible: boolean;
 onClose: () => void;
    onSubmit: () => void;
    text: string;
    setText: (text: string) => void;
    image: string | null;
    pickImage: () => void;
};

export default function CreatePostModal({
  visible,
  onClose,
  onSubmit,
  text,
  setText,
  image,
  pickImage,
}:CreatePostModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Create Post</Text>

          <TextInput
            style={styles.input}
            placeholder="What's on your mind?"
            placeholderTextColor="#777"
            multiline
            value={text}
            onChangeText={setText}
          />

          {image && (
            <Image source={{ uri: image }} style={styles.preview} />
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btn} onPress={pickImage}>
              <Text style={styles.btnText}>Add Image</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btn} onPress={onSubmit}>
              <Text style={styles.btnText}>Post</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 2,
    borderColor: "#000",
    padding: 20,
  },
  title: {
    fontFamily: "Montserrat",
    fontSize: 20,
    marginBottom: 12,
    color: "#000",
  },
  input: {
    fontFamily: "Lato",
    fontSize: 16,
    borderWidth: 2,
    borderColor: "#000",
    borderRadius: 12,
    padding: 12,
    height: 120,
    textAlignVertical: "top",
    marginBottom: 16,
    color: "#000",
  },
  preview: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#000",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  btn: {
    borderWidth: 2,
    borderColor: "#000",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  btnText: {
    fontFamily: "Montserrat",
    color: "#000",
    fontSize: 15,
  },
  closeBtn: {
    marginTop: 18,
    alignSelf: "center",
  },
  closeText: {
    fontFamily: "Lato",
    fontSize: 14,
    color: "#000",
    textDecorationLine: "underline",
  },
});
