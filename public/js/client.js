"use strict";
console.log("Client script initialized");

const config = {
  apiUrl: "https://us-central1-contract-app-native.cloudfunctions.net/app",
};

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOMContentLoaded");

  const form = document.getElementById("contractForm");
  const slides = document.querySelectorAll(".slide-style");
  const nextButtons = document.querySelectorAll(".is-next");
  const signButton = document.querySelector(".is-sign");
  const sendButton = document.querySelector(".is-send");
  const documentDiv = document.getElementById("generatedDocument");
  const signatureCanvas = document.getElementById("signatureCanvas");
  const clearSignatureButton = document.getElementById("clearSignature");
  const signatureInput = document.getElementById("textField-3");
  const textField2 = document.getElementById("textField-2");
  const fileInput = document.getElementById("buttonUpload");
  const fileUploadWrapper = document.getElementById("fileUploadWrapper");
  const fileUploadDiv = document.getElementById("fileUploadDiv");
  const fileRemoveBTN = document.getElementById("fileRemoveBTN");
  const fileTitle = document.getElementById("fileTitle");
  const tagStackElements = document.querySelectorAll(".tagStack");
  const techStack = document.getElementById("techStack");
  const defaultText = "The stack I'll be using is";

  const formData = {};
  let editor;
  let signaturePad;
  let selectedFile = null;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.style.display = i === index ? "block" : "none";
    });
  }

  if (documentDiv) documentDiv.style.display = "none";
  let currentSlideIndex = 0;
  showSlide(currentSlideIndex);

  initializeEditor();
  initializeSignaturePad();

  nextButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const currentSlideInputs =
        slides[currentSlideIndex].querySelectorAll("input, textarea");
      currentSlideInputs.forEach((input) => {
        formData[input.id] = input.value;
        console.log(`Value of ${input.id}: `, input.value);
      });

      if (currentSlideIndex === 1) {
        try {
          const contractId = await generateAIDocument();
          sendButton.dataset.contractId = contractId;
        } catch (error) {
          console.error("Error generating AI document:", error);
        }
      }

      if (currentSlideIndex < slides.length - 1) {
        currentSlideIndex++;
        showSlide(currentSlideIndex);
      }
    });
  });

  if (fileInput) {
    fileInput.addEventListener("change", (event) => {
      if (event.target.files && event.target.files.length > 0) {
        selectedFile = event.target.files[0];
        const fileName = selectedFile.name;

        console.log("File selected:", fileName);
        console.log("File object:", selectedFile);

        if (fileUploadDiv) {
          fileUploadDiv.textContent = `Selected file: ${fileName}`;
        }

        if (fileRemoveBTN) fileRemoveBTN.style.display = "inline";
        if (fileTitle) fileTitle.textContent = fileName;
        if (fileUploadWrapper) {
          fileUploadWrapper.style.display = "block";
        }
      } else {
        console.log("No file selected");
        selectedFile = null;
        if (fileUploadDiv) fileUploadDiv.textContent = "No file selected";
        if (fileRemoveBTN) fileRemoveBTN.style.display = "none";
        if (fileTitle) fileTitle.textContent = "None";
        if (fileUploadWrapper) {
          fileUploadWrapper.style.display = "none";
        }
      }
    });
  }

  if (fileRemoveBTN) {
    fileRemoveBTN.addEventListener("click", () => {
      if (fileInput) fileInput.value = "";
      if (fileUploadDiv) fileUploadDiv.textContent = "No file selected";
      if (fileRemoveBTN) fileRemoveBTN.style.display = "none";
      if (fileTitle) fileTitle.textContent = "None";
      if (fileUploadWrapper) {
        fileUploadWrapper.style.display = "none";
      }
    });
  }

  function readPDFContent(file) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();

      fileReader.onload = async function (event) {
        try {
          const typedArray = new Uint8Array(event.target.result);
          const loadingTask = pdfjsLib.getDocument(typedArray);
          const pdf = await loadingTask.promise;
          let fullText = "";

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item) => item.str).join(" ");
            fullText += pageText + "\n";
          }

          resolve(fullText);
        } catch (error) {
          console.error("Error reading PDF:", error);
          reject(error);
        }
      };

      fileReader.onerror = function (error) {
        console.error("FileReader error:", error);
        reject(error);
      };

      fileReader.readAsArrayBuffer(file);
    });
  }

  if (textField2) textField2.placeholder = defaultText;

  if (techStack) {
    techStack.addEventListener("click", (event) => {
      const clickedTag = event.target.closest(".tagstack");
      if (clickedTag && textField2) {
        const tagName = clickedTag.textContent.trim();
        console.log("Tag clicked:", tagName);

        if (!textField2.value || textField2.value === defaultText) {
          textField2.value = defaultText + " ";
        }

        textField2.value += textField2.value.endsWith(" ")
          ? tagName
          : ", " + tagName;

        clickedTag.style.display = "none";

        textField2.focus();
        textField2.setSelectionRange(
          textField2.value.length,
          textField2.value.length
        );
        console.log("Updated textarea value:", textField2.value);
      }
    });
  }

  if (textField2) {
    textField2.addEventListener("input", function () {
      const tags = this.value
        .replace(defaultText, "")
        .split(",")
        .map((tag) => tag.trim());
      const removedTags = document.querySelectorAll(
        '.tagstack[style*="display: none"]'
      );

      removedTags.forEach((tag) => {
        if (!tags.includes(tag.textContent.trim())) {
          tag.style.display = "";
        }
      });
    });
  }

  function processInlineFormatting(text) {
    text = text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
    text = text.replace(/\*(.*?)\*/g, "<i>$1</i>");
    text = text.replace(/`(.*?)`/g, "<code>$1</code>");
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
    return text;
  }

  const db = firebase.firestore();

  async function generateAIDocument() {
    let pdfContent = "";

    if (selectedFile) {
      try {
        console.log("Starting to read PDF content...");
        pdfContent = await readPDFContent(selectedFile);
        console.log("PDF content read successfully:", pdfContent);
      } catch (error) {
        console.error("Error reading PDF:", error);
      }
    } else {
      console.log("No file selected for AI document generation");
    }

    const functionUrl = `${config.apiUrl}/api/openai`;
    console.log("Function URL:", functionUrl);

    const promptText = `Create a contract using the following details:
    Project Description: ${formData["textField-1"] || "[No project description provided]"}
    Tech Stack: ${formData["textField-2"] || "[No tech stack provided]"}
    Additional Information from PDF:
    ${pdfContent || "[No PDF content available]"}

    Instructions:
    - Analyze both the user-provided information and the PDF content.
    - Create a unified contract that incorporates all relevant details without redundancy.
    - If there are conflicts between user-provided information and PDF content, prioritize the user-provided information but mention any significant discrepancies.
    - Ensure the contract follows a logical structure with clear sections (e.g., Project Scope, Timeline, Budget, Terms and Conditions).
    - If any critical information is missing, add placeholders or suggest what kind of information should be added.
    - The final contract should be coherent, professional, and ready for review and signatures.
    - Always Add placeholders for Signature and only one time add other then client like '[SIGNATURE_GOES_HERE]'`;

    console.log("Sending prompt to AI:", promptText);

    try {
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API response error:", response.status, errorText);
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log("AI Document Generated:", data.response);

      const contractId = `contract_${Date.now()}`;
      const contractRef = db.collection("contracts").doc(contractId);

      await contractRef.set({
        projectDescription: formData["textField-1"] || "",
        techStack: formData["textField-2"] || "",
        pdfContent: pdfContent || "",
        generatedContract: data.response,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        status: "generated",
      });

      console.log("Contract saved in Firebase with ID:", contractId);

      if (documentDiv) documentDiv.style.display = "block";

      if (editor) {
        await editor.isReady;
        editor.blocks.clear();

        const lines = data.response.split("\n");
        lines.forEach((line) => {
          if (line.startsWith("### ")) {
            editor.blocks.insert("header", {
              text: line.replace("### ", ""),
              level: 3,
            });
          } else if (line.startsWith("## ")) {
            editor.blocks.insert("header", {
              text: line.replace("## ", ""),
              level: 2,
            });
          } else if (line.startsWith("# ")) {
            editor.blocks.insert("header", {
              text: line.replace("# ", ""),
              level: 1,
            });
          } else if (line.startsWith("- ")) {
            editor.blocks.insert("list", {
              items: [processInlineFormatting(line.replace("- ", ""))],
              style: "unordered",
            });
          } else if (/^\d+\.\s/.test(line)) {
            editor.blocks.insert("list", {
              items: [processInlineFormatting(line.replace(/^\d+\.\s/, ""))],
              style: "ordered",
            });
          } else if (line.trim() === "") {
            editor.blocks.insert("paragraph", { text: "" });
          } else {
            editor.blocks.insert("paragraph", {
              text: processInlineFormatting(line),
            });
          }
        });
      }

      return contractId;
    } catch (error) {
      console.error("Error generating or storing AI document:", error);
      throw error;
    }
  }

  if (signButton) {
    signButton.addEventListener("click", async (event) => {
      event.preventDefault();
      if (document.getElementById('sign-appended-div')) {
        const appended_element = document.getElementById("sign-appended-div");
        appended_element.remove(); // Removes the div with the 'div-02' id
      }
      const typedSignature = signatureInput ? signatureInput.value.trim() : "";
      let signature = "";
      let uploadedFile = "";

      if (typedSignature !== "") {
        signature = typedSignature;
      }

      // Prioritize signaturePad over typedSignature
      if (signaturePad && !signaturePad.isEmpty()) {
        signature = signaturePad.toDataURL()
        uploadedFile = await uploadByFile(dataURLtoBlob(signature));

        if (!uploadedFile.success) {
          alert("Signature upload failed. Please try again")
          return;
        }
      }

      if (signature === "") {
        alert("Please either type or draw a signature.");
        return;
      }
      //..//
      formData["signature"] = signature;
      if (editor) {
        const blocks = await editor.save();
        const paragraphs = document.querySelectorAll('.ce-paragraph');

        // Loop through each element and use switch to check for specific text
        paragraphs.forEach((paragraph, index) => {
          const textContent = paragraph.textContent.trim(); // Get the text content and trim extra spaces

          // Create the new div element to be added
          const newDiv = document.createElement('div');
          newDiv.className = 'appended-div'; // Optional: Add a class for styling
          newDiv.id = 'sign-appended-div';
          newDiv.innerHTML = '<img id="signature_image" class="image-tool__image-picture" src="'+signature+'" width="250px" height="150px">'; // Content inside the new div
          const boldText = paragraph.querySelector('b')?.textContent.trim();
          if(boldText){            
            // Check if the bold text matches what you're looking for
            
            switch (boldText) {
            // Using 'true' in the switch to allow matching on the includes() condition
            
              case '[SIGNATURE_GOES_HERE]':
                paragraph.insertAdjacentElement('afterend', newDiv);
                break;
              
              default:
                //console.log(`No signature found in block ${index + 1}`);
            }
          }else{
            if (paragraph.textContent.includes('[SIGNATURE_GOES_HERE]')) {
                paragraph.insertAdjacentElement('afterend', newDiv);
            }
          }

        });
         
         
        // if (signatureLineIndex !== -1) {
        //   // Replace the signature line with the signature image
        //   await editor.blocks.update(signatureLineIndex, {
        //     type: "image",
        //     data: {
        //       file: {
        //         url: uploadedFile?.file?.url ?? signature
        //       },
        //       caption: "Signed by Contractor",
        //       withBorder: false,
        //       withBackground: false,
        //       stretched: false,
        //     },
        //   });
        // } else {
        //   // If the signature line is not found, append the signature at the end
        //   const blocksCount = editor.blocks.getBlocksCount();
        //   await editor.blocks.insert("image", {
        //     file: {
        //       url: uploadedFile?.file?.url ?? signature
        //     },
        //     caption: "Signed by Contractor",
        //     withBorder: false,
        //     withBackground: false,
        //     stretched: false,
        //   }, '', blocksCount);
        // }
      }

      if (currentSlideIndex < slides.length - 1) {
        currentSlideIndex++;
        showSlide(currentSlideIndex);
      }
      setTimeout(() => {
        if (window.getComputedStyle(document.getElementById("slide-4")).display === "block") {
          const toolbars = document.getElementsByClassName("ce-toolbar");          
          
          // Convert the HTMLCollection to an array and remove each element
          Array.from(toolbars).forEach(toolbar => toolbar.remove());
          document.getElementById("generatedDocument").setAttribute("contenteditable", true);
          const generatedDocument = document.getElementById('generatedDocument');
          if (!document.getElementById("edit_mode_div")) {
            const newDivNew = '<div class="editble_button" id="edit_mode_div"><span>Edit Agreement</span></div>';  
            // Use insertAdjacentHTML to insert the new div as HTML
            generatedDocument.insertAdjacentHTML('afterbegin', newDivNew);
          }
          // Set the parent element to non-editable
          generatedDocument.setAttribute('contenteditable', 'false');
      
          // Set all child elements to non-editable
          const allChildren = generatedDocument.querySelectorAll('*');
          allChildren.forEach(child => {
          child.setAttribute('contenteditable', 'false');
          });
          const edit_mode_bu = document.getElementById('edit_mode_div');
          if(edit_mode_bu){
            edit_mode_bu.addEventListener('click', () => {
              //editor.readOnly.toggle()
              if (currentSlideIndex) {   
                currentSlideIndex--;              
                showSlide(currentSlideIndex);
              }
              edit_mode_bu.remove();
              generatedDocument.setAttribute('contenteditable', 'true');
      
              // Set all child elements to non-editable
              const allChildren = generatedDocument.querySelectorAll('*');
              allChildren.forEach(child => {
              child.setAttribute('contenteditable', 'true');
              });
              console.log('Editor in read only mode')
            })
          }
        }
      },500);       
    });
  }

  if (clearSignatureButton && signaturePad) {
    clearSignatureButton.addEventListener("click", () => {
      signaturePad.clear();
    });
  }

  
  if (sendButton) {
    sendButton.addEventListener("click", async (event) => {
      event.preventDefault();
      const contractId = event.target.dataset.contractId;

      if (!contractId) {
        alert("No contract generated yet. Please generate a contract first.");
        return;
      }

      try {
        const contractRef = db.collection("contracts").doc(contractId);
        const contractDoc = await contractRef.get();

        if (!contractDoc.exists) {
          throw new Error("Contract not found in Firebase");
        }

        const editorContent = await editor.save();

        await contractRef.update({
          editorContent: editorContent,
          status: "ready_to_send",
        });

        // Make editor readonly
        editor.readOnly.toggle()
        console.log('Editor in read only mode')

        const sendContractUrl = `${config.apiUrl}/send-contract`;
        const response = await fetch(sendContractUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contractId: contractId,
            editorContent: editorContent,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Send contract error:", response.status, errorText);
          throw new Error(
            `Send contract failed: ${response.status} ${errorText}`
          );
        }

        const data = await response.json();
        console.log("Contract sent successfully:", data);

        await contractRef.update({ status: "sent" });

        alert("Contract sent successfully!");
      } catch (error) {
        console.error("Error sending contract:", error);
        alert(`Failed to send contract: ${error.message}. Please try again.`);
      }
    });
  }

  function initializeEditor() {
    editor = new EditorJS({
      holder: "editorjs",
      tools: {
        header: {
          class: Header,
          inlineToolbar: ["link", "bold"],
          config: {
            placeholder: "Enter a header",
            levels: [1, 2, 3],
            defaultLevel: 2,
          },
        },
        list: { class: List, inlineToolbar: true },
        quote: {
          class: Quote,
          inlineToolbar: true,
          config: {
            quotePlaceholder: "Enter a quote",
            captionPlaceholder: "Quote's author",
          },
        },
        paragraph: { class: Paragraph, inlineToolbar: true },
        delimiter: Delimiter,
        image: {
          class: ImageTool,
          config: {
            endpoints: {},
            additionalRequestHeaders: {
              // Add any headers needed for image upload/fetch
            },
            captionPlaceholder: "Signature",
            defaultSize: {
              width: 300,
              height: 100,
            },
          },
        },
      },
      placeholder: "Let's write your contract here...",
      autofocus: true,
      onReady: () => {
        console.log("Editor.js is ready");
      },
    });
  }

  function initializeSignaturePad() {
    if (signatureCanvas) {
      signaturePad = new SignaturePad(signatureCanvas);

      if (clearSignatureButton) {
        clearSignatureButton.addEventListener("click", () => {
          signaturePad.clear();
        });
      }

      if (signButton) {
        signButton.addEventListener("click", () => {
          if (signaturePad.isEmpty()) {
            alert("Please provide a signature.");
            return;
          }

          formData["signature"] = signaturePad.toDataURL();
          console.log("Signature saved in formData:", formData["signature"]);
        });
      }
    } else {
      console.error("Signature canvas not found");
    }
  }

  function dataURLtoBlob(dataURL) {
    const byteString = atob(dataURL.split(",")[1]);
    const mimeString = dataURL.split(",")[0].split(":")[1].split(";")[0];

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return {
      blob: new Blob([ab], { type: mimeString }),
      type: mimeString.split("/")[1]
    };
}

  async function uploadImageToFirebase(file, type = 'png') {
    const storageRef = firebase.storage().ref();
    const imageRef = storageRef.child(`images/${Date.now()}.${type}`);

    return await imageRef.put(file)
      .then(() => imageRef.getDownloadURL())
      .then(downloadURL => {
        return {
          success: 1,
          file: {
            url: downloadURL,
          },
        }
      })
      .catch(error => {
          console.error("Error uploading image to Firebase:", error);
          
          return {
            success: 0,
            file: {
              url: null,
            },
          }
      });
  }

  async function uploadByFile(file) {
    return await uploadImageToFirebase(file.blob, file.type);
  }

  async function uploadByUrl(url) {
    return {
      success: 1,
      file: {
        url: url,
      },
    };
  }
});
