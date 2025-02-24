import React, { useState } from "react";
import "./App.css"

const VotingUI = () => {
  const [voterID, setVoterID] = useState("");
  const [candidate, setCandidate] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [message, setMessage] = useState("");
  
  const handleSubmit = async () => {
    if (!voterID || !candidate ) {
      setMessage("Please fill in all the fields!");
      return;
    }

    try {
      // Simulating an API call to cast the votes

      const response = await fetch("http://localhost:5000/vote/cast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ voterID, candidate }),
      });
      console.log(voterID);
      const result = await response.json();
      setMessage(result.message || "Vote cast successfully!");
    } catch (error) {
    setMessage("Error casting vote. Please try again.");
  }
};

  return (
     <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Cast Your Vote</h1>

      <div style={{ marginBottom: "15px" }}>
        <input
          type="text"
          placeholder="Enter Voter ID"
          value={voterID}
          onChange={(e) => setVoterID(e.target.value)}
          style={{ padding: "10px", width: "300px", marginBottom: "10px" }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <select
          value={candidate}
          onChange={(e) => setCandidate(e.target.value)}
          style={{ padding: "10px", width: "320px" }}
        >
          <option value="">Select a Candidate</option>
          <option value="Candidate_A">Candidate A</option>
          <option value="Candidate_B">Candidate B</option>
          <option value="Candidate_C">Candidate C</option>
        </select>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <input
          type="text"
          placeholder="Enter Private Key"
          value={privateKey}
          // onChange={(e) => setPrivateKey(e.target.value)}
          style={{ padding: "10px", width: "300px", marginBottom: "10px" }}
          readOnly
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <input
          type="text"
          placeholder="Enter Public Key"
          value={publicKey}
          // onChange={(e) => setPublicKey(e.target.value)}
          style={{ padding: "10px", width: "300px", marginBottom: "10px" }}
          readOnly
        />
      </div>

      <button
        onClick={handleSubmit}
        style={{
          padding: "10px 20px",
          backgroundColor: "#007BFF",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Cast Vote
      </button>

      {message && <p style={{ marginTop: "20px", color: "green" }}>{message}</p>}
    </div>
  );
};

export default VotingUI;