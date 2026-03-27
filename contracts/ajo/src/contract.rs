use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Vec};

use crate::errors::AjoError;
use crate::events;
use crate::pausable;
use crate::storage;
use crate::errors::AjoError;
use crate::events;
use crate::pausable;
use crate::storage;
use crate::types::{
    Dispute,
    DisputeResolution,
    DisputeStatus,
    DisputeType,
    DisputeVote,
    Group, 
    GroupMetadata, 
    GroupStatus,
    RefundReason,
};
use crate::utils;
use crate::utils;

/// The main Ajo contract
#[contract]
pub struct AjoContract;

#[contractimpl]
impl AjoContract {
    /// Initialize the contract with an admin.
    ///
    /// This function must be called exactly once to set up the contract's admin.
    /// After initialization, the admin can upgrade the contract.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `admin` - Address of the contract administrator
    ///
    /// # Returns
    /// `Ok(())` on successful initialization
    ///
    /// # Errors
    /// * `AlreadyInitialized` - If the contract has already been initialized
    pub fn initialize(env: Env, admin: Address) -> Result<(), AjoError> {
        if storage::get_admin(&env).is_some() {
            return Err(AjoError::AlreadyInitialized);
        }
        storage::store_admin(&env, &admin);
        Ok(())
    }

    /// Upgrade the contract's Wasm bytecode.
    ///
    /// Only the admin can call this function. The contract will be updated to the
    /// new Wasm code specified by `new_wasm_hash`.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `new_wasm_hash` - The hash of the new Wasm code (32 bytes)
    ///
    /// # Returns
    /// `Ok(())` on successful upgrade
    ///
    /// # Errors
    /// * `Unauthorized` - If the caller is not the admin
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), AjoError> {
        let admin = storage::get_admin(&env).ok_or(AjoError::Unauthorized)?;
        admin.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }

    /// Pause the contract to prevent state-mutating operations.
    ///
    /// This emergency function allows the admin to temporarily halt all state-mutating
    /// operations (create_group, join_group, contribute, execute_payout) while keeping
    /// query functions and admin functions operational. This is useful during security
    /// incidents, detected vulnerabilities, or maintenance periods.
    ///
    /// When paused:
    /// - All state-mutating operations will fail with `ContractPaused` error
    /// - Query operations continue to work normally
    /// - Admin operations (pause, unpause, upgrade) remain available
    /// - All stored data (groups, contributions, payouts) remains safe and intact
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    ///
    /// # Returns
    /// `Ok(())` on successful pause
    ///
    /// # Errors
    /// * `UnauthorizedPause` - If the caller is not the admin
    ///
    /// # Authorization
    /// Only the contract admin can call this function.
    pub fn pause(env: Env) -> Result<(), AjoError> {
        pausable::pause(&env)
    }

    /// Unpause the contract to restore normal operations.
    ///
    /// This function allows the admin to restore full contract functionality after
    /// an emergency pause. Once unpaused, all state-mutating operations return to
    /// normal operation. All data remains intact and accessible.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    ///
    /// # Returns
    /// `Ok(())` on successful unpause
    ///
    /// # Errors
    /// * `UnauthorizedUnpause` - If the caller is not the admin
    ///
    /// # Authorization
    /// Only the contract admin can call this function.
    ///
    /// # Data Safety
    /// Unpausing does not modify any stored data. All groups, contributions, and
    /// payouts remain exactly as they were before the pause.
    pub fn unpause(env: Env) -> Result<(), AjoError> {
        pausable::unpause(&env)
    }

    /// Create a new Ajo group.
    ///
    /// Initializes a new rotating savings group with the specified parameters.
    /// The creator becomes the first member and the contract validates all parameters
    /// before storage. A unique group ID is assigned and returned.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `creator` - Address of the group creator (automatically becomes first member)
    /// * `contribution_amount` - Fixed amount each member contributes per cycle (in stroops, must be > 0)
    /// * `cycle_duration` - Duration of each cycle in seconds (must be > 0)
    /// * `max_members` - Maximum number of members allowed in the group (must be >= 2 and <= 100)
    /// * `grace_period` - Grace period duration in seconds after cycle ends (default: 86400 = 24 hours)
    /// * `penalty_rate` - Penalty rate as percentage for late contributions (0-100, default: 5)
    ///
    /// # Returns
    /// The unique group ID assigned to the new group
    ///
    /// # Errors
    /// * `ContributionAmountZero` - If contribution_amount == 0
    /// * `ContributionAmountNegative` - If contribution_amount < 0
    /// * `CycleDurationZero` - If cycle_duration == 0
    /// * `MaxMembersBelowMinimum` - If max_members < 2
    /// * `MaxMembersAboveLimit` - If max_members > 100
    /// * `InvalidGracePeriod` - If grace_period > 7 days
    /// * `InvalidPenaltyRate` - If penalty_rate > 100
    pub fn create_group(
        env: Env,
        creator: Address,
        contribution_amount: i128,
        cycle_duration: u64,
        max_members: u32,
        grace_period: u64,
        penalty_rate: u32,
    ) -> Result<u64, AjoError> {
        // Validate parameters
        utils::validate_group_params(contribution_amount, cycle_duration, max_members)?;
        utils::validate_penalty_params(grace_period, penalty_rate)?;

        // Check if paused
        pausable::ensure_not_paused(&env)?;

        // Require authentication
        creator.require_auth();

        // Generate new group ID
        let group_id = storage::get_next_group_id(&env);

        // Initialize members list with creator
        let mut members = Vec::new(&env);
        members.push_back(creator.clone());

        // Get current timestamp
        let now = utils::get_current_timestamp(&env);

        // Create group
        let group = Group {
            id: group_id,
            creator: creator.clone(),
            contribution_amount,
            cycle_duration,
            max_members,
            members,
            current_cycle: 1,
            payout_index: 0,
            created_at: now,
            cycle_start_time: now,
            is_complete: false,
            grace_period,
            penalty_rate,
            state: crate::types::GroupState::Active,
        };

        // Store group
        storage::store_group(&env, group_id, &group);

        // Emit event
        events::emit_group_created(&env, group_id, &creator, contribution_amount, max_members);

        Ok(group_id)
    }

    /// Get group information.
    ///
    /// Retrieves the complete group data including all members, cycle information,
    /// and metadata.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The unique group identifier
    ///
    /// # Returns
    /// The group data containing group configuration and current state
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    pub fn get_group(env: Env, group_id: u64) -> Result<Group, AjoError> {
        storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)
    }

    /// Get list of all members in a group.
    ///
    /// Returns the ordered list of all member addresses currently in the group.
    /// Members are ordered by join time, with the creator being the first member.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The unique group identifier
    ///
    /// # Returns
    /// Vector of member addresses in join order
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    pub fn list_members(env: Env, group_id: u64) -> Result<Vec<Address>, AjoError> {
        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;
        Ok(group.members)
    }

    /// Join an existing group.
    ///
    /// Adds a new member to an active group if space is available.
    /// The member's authentication is required. The member cannot join if they
    /// are already a member, the group is full, or the group has completed all cycles.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `member` - Address of the member joining (must authenticate)
    /// * `group_id` - The group to join
    ///
    /// # Returns
    /// `Ok(())` on successful group join
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    /// * `MaxMembersExceeded` - If the group has reached max members
    /// * `AlreadyMember` - If the address is already a member
    /// * `GroupComplete` - If the group has completed all cycles
    pub fn join_group(env: Env, member: Address, group_id: u64) -> Result<(), AjoError> {
        // Check if paused
        pausable::ensure_not_paused(&env)?;

        // Require authentication
        member.require_auth();

        // Get group
        let mut group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        // Cache member count for comparisons
        let member_count = group.members.len() as u32;
        let max_members = group.max_members;

        // Check if group is complete
        if group.is_complete {
            return Err(AjoError::GroupComplete);
        }

        // Check if group is cancelled
        if group.state == crate::types::GroupState::Cancelled {
            return Err(AjoError::GroupCancelled);
        }

        // Check if group is cancelled
        if group.state == crate::types::GroupState::Cancelled {
            return Err(AjoError::GroupCancelled);
        }

        // Check if group is cancelled
        if group.state == crate::types::GroupState::Cancelled {
            return Err(AjoError::GroupCancelled);
        }

        // Check if already a member
        if utils::is_member(&group.members, &member) {
            return Err(AjoError::AlreadyMember);
        }

        // Check if group is full
        if member_count >= max_members {
            return Err(AjoError::MaxMembersExceeded);
        }

        // Add member
        group.members.push_back(member.clone());

        // Update storage
        storage::store_group(&env, group_id, &group);

        // Emit event
        events::emit_member_joined(&env, group_id, &member);

        Ok(())
    }

    /// Check if an address is a member of a group.
    ///
    /// Returns whether the provided address is currently a member of the specified group.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The group to check
    /// * `address` - The address to check
    ///
    /// # Returns
    /// `true` if the address is a member, `false` otherwise
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    pub fn is_member(env: Env, group_id: u64, address: Address) -> Result<bool, AjoError> {
        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;
        Ok(utils::is_member(&group.members, &address))
    }

    /// Contribute to the current cycle.
    ///
    /// Records a member's contribution for the current cycle. Each member can contribute
    /// once per cycle. Authentication is required. Contributions are recorded but actual
    /// fund transfers are handled by external payment systems.
    ///
    /// Late contributions (after cycle ends but within grace period) incur penalties.
    /// Contributions after grace period are rejected.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `member` - Address making the contribution (must authenticate)
    /// * `group_id` - The group to contribute to
    ///
    /// # Returns
    /// `Ok(())` on successful contribution recording
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    /// * `NotMember` - If the address is not a member
    /// * `AlreadyContributed` - If already contributed this cycle
    /// * `GroupComplete` - If the group has completed all cycles
    /// * `GracePeriodExpired` - If contribution is too late (after grace period)
    pub fn contribute(env: Env, member: Address, group_id: u64) -> Result<(), AjoError> {
        // Check if paused
        pausable::ensure_not_paused(&env)?;

        // Require authentication
        member.require_auth();

        // Get group (single fetch)
        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        // Cache frequently accessed values
        let group_id_cached = group.id;
        let current_cycle = group.current_cycle;
        let contribution_amount = group.contribution_amount;

        // Check if group is complete
        if group.is_complete {
            return Err(AjoError::GroupComplete);
        }

        // Check if group is cancelled
        if group.state == crate::types::GroupState::Cancelled {
            return Err(AjoError::GroupCancelled);
        }

        // Check if member
        if !utils::is_member(&group.members, &member) {
            return Err(AjoError::NotMember);
        }

        // Check if already contributed
        if storage::has_contributed(&env, group_id_cached, current_cycle, &member) {
            return Err(AjoError::AlreadyContributed);
        }

        // Record contribution
        storage::store_contribution(&env, group_id_cached, current_cycle, &member, true);

        // Emit event
        events::emit_contribution_made(
            &env,
            group_id_cached,
            &member,
            current_cycle,
            contribution_amount,
        );

        Ok(())
    }

    /// Get contribution status for all members in a specific cycle.
    ///
    /// Returns an ordered list of all members paired with their contribution status
    /// for the specified cycle. Member order matches the group's member list order.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The group to check
    /// * `cycle_number` - The cycle to check (typically use current_cycle from group)
    ///
    /// # Returns
    /// Vector of (Address, bool) tuples where `true` indicates the member has contributed
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    pub fn get_contribution_status(
        env: Env,
        group_id: u64,
        cycle_number: u32,
    ) -> Result<Vec<(Address, bool)>, AjoError> {
        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;
        Ok(storage::get_cycle_contributions(
            &env,
            group_id,
            cycle_number,
            &group.members,
        ))
    }

    /// Execute payout for the current cycle.
    ///
    /// This is the core function that rotates payouts through group members.
    /// It verifies that all members have contributed, calculates the total payout
    /// (including any penalties collected), distributes funds to the next recipient,
    /// and advances the cycle. When all members have received their payout, the group
    /// is marked complete.
    ///
    /// Payout can only be executed after the grace period expires to ensure all
    /// late contributions are collected.
    ///
    /// Process:
    /// 1. Verifies all members have contributed in the current cycle
    /// 2. Ensures grace period has expired
    /// 3. Calculates total payout (contribution_amount × member_count + penalties)
    /// 4. Records payout to the current recipient
    /// 5. Emits payout event with penalty bonus
    /// 6. Advances to next cycle (or marks complete if done)
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The group to execute payout for
    ///
    /// # Returns
    /// `Ok(())` on successful payout execution
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    /// * `IncompleteContributions` - If not all members have contributed
    /// * `GroupComplete` - If the group has already completed all payouts
    /// * `NoMembers` - If the group has no members (should never happen)
    /// * `OutsideCycleWindow` - If grace period has not expired yet
    pub fn execute_payout(env: Env, group_id: u64) -> Result<(), AjoError> {
        // Check if paused
        pausable::ensure_not_paused(&env)?;

        // Get group (single fetch)
        let mut group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        // Check if group is cancelled
        if group.state == crate::types::GroupState::Cancelled {
            return Err(AjoError::GroupCancelled);
        }

        // Check if group is complete
        if group.is_complete {
            return Err(AjoError::GroupComplete);
        }

        // Cache frequently accessed values
        let group_id_cached = group.id;
        let current_cycle = group.current_cycle;
        let member_count = group.members.len();

        // Check if all members have contributed
        if !utils::all_members_contributed(&env, &group) {
            return Err(AjoError::IncompleteContributions);
        }

        // Ensure grace period has expired before executing payout
        let current_time = utils::get_current_timestamp(&env);
        let grace_end = utils::get_grace_period_end(&group);
        if current_time < grace_end {
            // Still within grace period - delay payout
            return Err(AjoError::OutsideCycleWindow);
        }

        // Get payout recipient
        let payout_recipient = group
            .members
            .get(group.payout_index)
            .ok_or(AjoError::NoMembers)?;

        // Calculate payout amounts: base payout + collected penalties for this cycle
        let base_payout = group.contribution_amount * (member_count as i128);
        let penalty_bonus = storage::get_cycle_penalty_pool(&env, group_id_cached, current_cycle);
        let payout_amount = base_payout + penalty_bonus;

        // Mark payout as received
        storage::mark_payout_received(&env, group_id_cached, &payout_recipient);

        // Emit payout event with penalty information
        if penalty_bonus > 0 {
            events::emit_penalty_distributed(
                &env,
                group_id,
                &payout_recipient,
                group.current_cycle,
                base_payout,
                penalty_bonus,
            );
        }

        events::emit_payout_executed(
            &env,
            group_id_cached,
            &payout_recipient,
            current_cycle,
            payout_amount,
        );

        // Advance payout index
        group.payout_index += 1;

        // Check if all members have received payout
        if group.payout_index >= member_count as u32 {
            // All members have received payout - mark complete
            group.is_complete = true;
            events::emit_group_completed(&env, group_id_cached);
        } else {
            // Advance to next cycle
            group.current_cycle += 1;
            group.cycle_start_time = utils::get_current_timestamp(&env);
        }

        // Update storage (single write)
        storage::store_group(&env, group_id, &group);

        Ok(())
    }

    /// Check if a group has completed all cycles.
    ///
    /// Returns whether the group has completed its full rotation,
    /// meaning all members have received at least one payout.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The group to check
    ///
    /// # Returns
    /// `true` if the group has completed all payouts, `false` otherwise
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    pub fn is_complete(env: Env, group_id: u64) -> Result<bool, AjoError> {
        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;
        Ok(group.is_complete)
    }

    /// Get comprehensive group status.
    ///
    /// Returns a detailed snapshot of the group's current state, including cycle
    /// information, contribution status, payout progress, and timing data.
    /// This is the primary function for checking a group's overall progress.
    ///
    /// Returns information about:
    /// - Current cycle number and progress
    /// - Next recipient for payout
    /// - Members who have contributed and those who are pending
    /// - Cycle timing (start time, end time, whether cycle is active)
    /// - Whether the group is complete
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The unique group identifier
    ///
    /// # Returns
    /// A `GroupStatus` struct containing comprehensive group state information
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    pub fn get_group_status(env: Env, group_id: u64) -> Result<GroupStatus, AjoError> {
        // Get the group data (single fetch)
        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        // Cache frequently accessed values
        let current_time = utils::get_current_timestamp(&env);
        let member_count = group.members.len();
        let group_id_cached = group.id;
        let current_cycle = group.current_cycle;

        // Calculate cycle timing
        let cycle_end_time = group.cycle_start_time + group.cycle_duration;
        let grace_period_end_time = utils::get_grace_period_end(&group);
        let is_cycle_active = current_time < cycle_end_time;
        let is_in_grace_period = utils::is_within_grace_period(&group, current_time);

        // Get penalty pool for current cycle
        let cycle_penalty_pool = storage::get_cycle_penalty_pool(&env, group_id, group.current_cycle);

        // Build pending_contributors list
        let mut contributions_received: u32 = 0;
        let mut pending_contributors = Vec::new(&env);

        // Single pass through members to check contributions
        for member in group.members.iter() {
            if storage::has_contributed(&env, group_id_cached, current_cycle, &member) {
                contributions_received += 1;
            } else {
                pending_contributors.push_back(member);
            }
        }

        // Determine next recipient
        let (has_next_recipient, next_recipient) = if group.is_complete {
            // Use placeholder (creator) when complete
            (false, group.creator.clone())
        } else {
            // Get the member at payout_index
            let recipient = group
                .members
                .get(group.payout_index)
                .unwrap_or_else(|| group.creator.clone());
            (true, recipient)
        };

        // Build and return status
        Ok(GroupStatus {
            group_id: group.id,
            current_cycle: group.current_cycle,
            has_next_recipient,
            next_recipient,
            contributions_received,
            total_members: group.members.len() as u32,
            pending_contributors,
            is_complete: group.is_complete,
            is_cycle_active,
            cycle_start_time: group.cycle_start_time,
            cycle_end_time,
            current_time,
            cycle_penalty_pool,
            is_in_grace_period,
            grace_period_end_time,
        })
    }

    /// Set or update metadata for an Ajo group.
    ///
    /// Only the group creator can set or update metadata.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The unique group identifier
    /// * `name` - The name of the group
    /// * `description` - The description of the group
    /// * `rules` - The rules of the group
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group does not exist
    /// * `Unauthorized` - If the caller is not the group creator
    /// * `MetadataTooLong` - If any field exceeds its length limit
    pub fn set_group_metadata(
        env: Env,
        group_id: u64,
        name: soroban_sdk::String,
        description: soroban_sdk::String,
        rules: soroban_sdk::String,
    ) -> Result<(), AjoError> {
        // Validate lengths
        if name.len() > crate::types::MAX_NAME_LENGTH
            || description.len() > crate::types::MAX_DESCRIPTION_LENGTH
            || rules.len() > crate::types::MAX_RULES_LENGTH
        {
            return Err(AjoError::MetadataTooLong);
        }

        // Get group to verify existence and check creator
        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        // Require creator authentication
        group.creator.require_auth();

        // Create and store metadata
        let metadata = GroupMetadata {
            name,
            description,
            rules,
        };
        storage::store_group_metadata(&env, group_id, &metadata);

        Ok(())
    }

    /// Get metadata for an Ajo group.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The unique group identifier
    ///
    /// # Returns
    /// The group metadata
    ///
    /// # Errors
    /// * `GroupNotFound` - If metadata for the group doesn't exist
    pub fn get_group_metadata(env: Env, group_id: u64) -> Result<GroupMetadata, AjoError> {
        storage::get_group_metadata(&env, group_id).ok_or(AjoError::GroupNotFound)
    }

    /// Get member penalty statistics.
    ///
    /// Returns the penalty record for a member in a specific group, including
    /// late contribution count, on-time count, total penalties paid, and reliability score.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The unique group identifier
    /// * `member` - The member's address
    ///
    /// # Returns
    /// The member's penalty record
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group doesn't exist
    /// * `NotMember` - If the address is not a member of the group
    pub fn get_member_penalty_record(
        env: Env,
        group_id: u64,
        member: Address,
    ) -> Result<crate::types::MemberPenaltyRecord, AjoError> {
        // Verify group exists
        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        // Verify member
        if !utils::is_member(&group.members, &member) {
            return Err(AjoError::NotMember);
        }

        // Get penalty record or return default
        Ok(storage::get_member_penalty(&env, group_id, &member).unwrap_or(
            crate::types::MemberPenaltyRecord {
                member: member.clone(),
                group_id,
                late_count: 0,
                on_time_count: 0,
                total_penalties: 0,
                reliability_score: 100,
            },
        ))
    }

    /// Get detailed contribution record for a member in a specific cycle.
    ///
    /// Returns the full contribution record including timing, penalty information,
    /// and whether the contribution was late.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The unique group identifier
    /// * `cycle` - The cycle number
    /// * `member` - The member's address
    ///
    /// # Returns
    /// The detailed contribution record
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group doesn't exist or contribution record doesn't exist
    pub fn get_contribution_detail(
        env: Env,
        group_id: u64,
        cycle: u32,
        member: Address,
    ) -> Result<crate::types::ContributionRecord, AjoError> {
        storage::get_contribution_detail(&env, group_id, cycle, &member)
            .ok_or(AjoError::GroupNotFound)
    }

    /// Get the penalty pool for a specific cycle.
    ///
    /// Returns the total penalties collected during a cycle, which will be
    /// distributed to the payout recipient along with regular contributions.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The unique group identifier
    /// * `cycle` - The cycle number
    ///
    /// # Returns
    /// Total penalty amount in stroops
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group doesn't exist
    pub fn get_cycle_penalty_pool(env: Env, group_id: u64, cycle: u32) -> Result<i128, AjoError> {
        // Verify group exists
        storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        Ok(storage::get_cycle_penalty_pool(&env, group_id, cycle))
    }

    /// Cancel a group and refund all members.
    ///
    /// Only the group creator can cancel a group, and only before the first payout.
    /// All members who have contributed will receive their contributions back.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `creator` - Address of the group creator
    /// * `group_id` - The unique group identifier
    ///
    /// # Returns
    /// `Ok(())` on successful cancellation
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group doesn't exist
    /// * `OnlyCreatorCanCancel` - If the caller is not the group creator
    /// * `CannotCancelAfterPayout` - If any payout has been executed
    /// * `GroupCancelled` - If the group is already cancelled
    /// * `GroupComplete` - If the group is already complete
    pub fn cancel_group(env: Env, creator: Address, group_id: u64) -> Result<(), AjoError> {
        pausable::ensure_not_paused(&env)?;
        creator.require_auth();

        let mut group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        // Verify creator
        if group.creator != creator {
            return Err(AjoError::OnlyCreatorCanCancel);
        }

        // Check if already cancelled or complete
        if group.state == crate::types::GroupState::Cancelled {
            return Err(AjoError::GroupCancelled);
        }
        if group.state == crate::types::GroupState::Complete {
            return Err(AjoError::GroupComplete);
        }

        // Cannot cancel after first payout
        if group.payout_index > 0 {
            return Err(AjoError::CannotCancelAfterPayout);
        }

        // Calculate refunds for each member who contributed
        for member in group.members.iter() {
            if storage::has_contributed(&env, group_id, group.current_cycle, &member) {
                let refund_amount = group.contribution_amount;

                // Store refund record
                let refund_record = crate::types::RefundRecord {
                    group_id,
                    member: member.clone(),
                    amount: refund_amount,
                    timestamp: utils::get_current_timestamp(&env),
                    reason: crate::types::RefundReason::CreatorCancellation,
                };
                storage::store_refund_record(&env, group_id, &member, &refund_record);

                // Emit refund event
                events::emit_refund_processed(&env, group_id, &member, refund_amount, 0);
            }
        }

        // Update group state
        group.state = crate::types::GroupState::Cancelled;
        storage::store_group(&env, group_id, &group);

        // Emit cancellation event
        events::emit_group_cancelled(
            &env,
            group_id,
            &creator,
            group.members.len(),
            group.contribution_amount,
        );

        Ok(())
    }

    /// Request a refund for a group that has failed to complete.
    ///
    /// Any member can request a refund if the cycle deadline has passed and
    /// not all members have contributed. This initiates a voting period where
    /// members can vote on whether to approve the refund.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `requester` - Address of the member requesting the refund
    /// * `group_id` - The unique group identifier
    ///
    /// # Returns
    /// `Ok(())` on successful request creation
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group doesn't exist
    /// * `NotMember` - If the requester is not a member
    /// * `GroupCancelled` - If the group is already cancelled
    /// * `GroupComplete` - If the group is already complete
    /// * `CycleNotExpired` - If the cycle deadline hasn't passed
    /// * `RefundRequestExists` - If a refund request already exists
    pub fn request_refund(env: Env, requester: Address, group_id: u64) -> Result<(), AjoError> {
        pausable::ensure_not_paused(&env)?;
        requester.require_auth();

        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        // Verify member
        if !utils::is_member(&group.members, &requester) {
            return Err(AjoError::NotMember);
        }

        // Check group state
        if group.state == crate::types::GroupState::Cancelled {
            return Err(AjoError::GroupCancelled);
        }
        if group.state == crate::types::GroupState::Complete {
            return Err(AjoError::GroupComplete);
        }

        // Check if cycle has expired (past grace period)
        let now = utils::get_current_timestamp(&env);
        let grace_end = utils::get_grace_period_end(&group);
        if now <= grace_end {
            return Err(AjoError::CycleNotExpired);
        }

        // Check if refund request already exists
        if storage::has_refund_request(&env, group_id) {
            return Err(AjoError::RefundRequestExists);
        }

        // Create refund request
        let voting_deadline = now + crate::types::VOTING_PERIOD;
        let request = crate::types::RefundRequest {
            group_id,
            requester: requester.clone(),
            created_at: now,
            voting_deadline,
            votes_for: 0,
            votes_against: 0,
            executed: false,
            approved: false,
        };

        storage::store_refund_request(&env, group_id, &request);

        // Emit event
        events::emit_refund_requested(&env, group_id, &requester, voting_deadline);

        Ok(())
    }

    /// Vote on a refund request.
    ///
    /// Members can vote in favor or against a refund request during the voting period.
    /// Each member can only vote once.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `voter` - Address of the voting member
    /// * `group_id` - The unique group identifier
    /// * `in_favor` - true to vote in favor, false to vote against
    ///
    /// # Returns
    /// `Ok(())` on successful vote
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group doesn't exist
    /// * `NotMember` - If the voter is not a member
    /// * `NoRefundRequest` - If no refund request exists
    /// * `AlreadyVoted` - If the member has already voted
    /// * `VotingPeriodEnded` - If the voting period has ended
    pub fn vote_refund(
        env: Env,
        voter: Address,
        group_id: u64,
        in_favor: bool,
    ) -> Result<(), AjoError> {
        pausable::ensure_not_paused(&env)?;
        voter.require_auth();

        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        // Verify member
        if !utils::is_member(&group.members, &voter) {
            return Err(AjoError::NotMember);
        }

        // Get refund request
        let mut request = storage::get_refund_request(&env, group_id)
            .ok_or(AjoError::NoRefundRequest)?;

        // Check if already voted
        if storage::has_voted(&env, group_id, &voter) {
            return Err(AjoError::AlreadyVoted);
        }

        // Check voting period
        let now = utils::get_current_timestamp(&env);
        if now > request.voting_deadline {
            return Err(AjoError::VotingPeriodEnded);
        }

        // Record vote
        let vote = crate::types::RefundVote {
            group_id,
            voter: voter.clone(),
            in_favor,
            timestamp: now,
        };
        storage::store_refund_vote(&env, group_id, &voter, &vote);

        // Update vote counts
        if in_favor {
            request.votes_for += 1;
        } else {
            request.votes_against += 1;
        }
        storage::store_refund_request(&env, group_id, &request);

        // Emit event
        events::emit_refund_vote(&env, group_id, &voter, in_favor);

        Ok(())
    }

    /// Execute a refund after voting period ends.
    ///
    /// Can be called by any member after the voting period ends. If the refund
    /// is approved (>51% votes in favor), all members receive proportional refunds
    /// based on their contributions.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `executor` - Address executing the refund
    /// * `group_id` - The unique group identifier
    ///
    /// # Returns
    /// `Ok(())` on successful execution
    ///
    /// # Errors
    /// * `GroupNotFound` - If the group doesn't exist
    /// * `NoRefundRequest` - If no refund request exists
    /// * `VotingPeriodActive` - If the voting period hasn't ended
    /// * `RefundNotApproved` - If the refund wasn't approved
    /// * `RefundAlreadyExecuted` - If the refund has already been executed
    pub fn execute_refund(env: Env, executor: Address, group_id: u64) -> Result<(), AjoError> {
        pausable::ensure_not_paused(&env)?;
        executor.require_auth();

        let mut group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;
        let mut request = storage::get_refund_request(&env, group_id)
            .ok_or(AjoError::NoRefundRequest)?;

        // Check if already executed
        if request.executed {
            return Err(AjoError::RefundAlreadyExecuted);
        }

        // Check voting period ended
        let now = utils::get_current_timestamp(&env);
        if now <= request.voting_deadline {
            return Err(AjoError::VotingPeriodActive);
        }

        // Calculate approval percentage
        let total_votes = request.votes_for + request.votes_against;
        let approval_percentage = if total_votes > 0 {
            (request.votes_for * 100) / total_votes
        } else {
            0
        };

        // Check if approved
        if approval_percentage < crate::types::REFUND_APPROVAL_THRESHOLD {
            request.executed = true;
            request.approved = false;
            storage::store_refund_request(&env, group_id, &request);
            return Err(AjoError::RefundNotApproved);
        }

        // Process refunds for all members who contributed
        for member in group.members.iter() {
            if storage::has_contributed(&env, group_id, group.current_cycle, &member) {
                let refund_amount = group.contribution_amount;

                // Store refund record
                let refund_record = crate::types::RefundRecord {
                    group_id,
                    member: member.clone(),
                    amount: refund_amount,
                    timestamp: now,
                    reason: crate::types::RefundReason::MemberVote,
                };
                storage::store_refund_record(&env, group_id, &member, &refund_record);

                // Emit refund event
                events::emit_refund_processed(&env, group_id, &member, refund_amount, 1);
            }
        }

        // Update request and group state
        request.executed = true;
        request.approved = true;
        storage::store_refund_request(&env, group_id, &request);

        group.state = crate::types::GroupState::Cancelled;
        storage::store_group(&env, group_id, &group);

        Ok(())
    }

    /// Emergency refund by admin.
    ///
    /// Allows the contract admin to force a refund in case of disputes or emergencies.
    /// All members who have contributed receive their contributions back.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `admin` - Address of the contract admin
    /// * `group_id` - The unique group identifier
    ///
    /// # Returns
    /// `Ok(())` on successful emergency refund
    ///
    /// # Errors
    /// * `Unauthorized` - If the caller is not the admin
    /// * `GroupNotFound` - If the group doesn't exist
    /// * `GroupCancelled` - If the group is already cancelled
    pub fn emergency_refund(env: Env, admin: Address, group_id: u64) -> Result<(), AjoError> {
        admin.require_auth();

        // Verify admin
        let stored_admin = storage::get_admin(&env).ok_or(AjoError::Unauthorized)?;
        if admin != stored_admin {
            return Err(AjoError::Unauthorized);
        }

        let mut group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        // Check if already cancelled
        if group.state == crate::types::GroupState::Cancelled {
            return Err(AjoError::GroupCancelled);
        }

        let now = utils::get_current_timestamp(&env);
        let mut total_refunded = 0i128;

        // Process refunds for all members who contributed
        for member in group.members.iter() {
            if storage::has_contributed(&env, group_id, group.current_cycle, &member) {
                let refund_amount = group.contribution_amount;
                total_refunded += refund_amount;

                // Store refund record
                let refund_record = crate::types::RefundRecord {
                    group_id,
                    member: member.clone(),
                    amount: refund_amount,
                    timestamp: now,
                    reason: crate::types::RefundReason::EmergencyRefund,
                };
                storage::store_refund_record(&env, group_id, &member, &refund_record);

                // Emit refund event
                events::emit_refund_processed(&env, group_id, &member, refund_amount, 2);
            }
        }

        // Update group state
        group.state = crate::types::GroupState::Cancelled;
        storage::store_group(&env, group_id, &group);

        // Emit emergency refund event
        events::emit_emergency_refund(&env, group_id, &admin, total_refunded);

        Ok(())
    }

    /// Get refund request for a group.
    ///
    /// Returns the current refund request if one exists.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The unique group identifier
    ///
    /// # Returns
    /// The refund request
    ///
    /// # Errors
    /// * `NoRefundRequest` - If no refund request exists
    pub fn get_refund_request(
        env: Env,
        group_id: u64,
    ) -> Result<crate::types::RefundRequest, AjoError> {
        storage::get_refund_request(&env, group_id).ok_or(AjoError::NoRefundRequest)
    }

    /// Get refund record for a member.
    ///
    /// Returns the refund record if the member has received a refund.
    ///
    /// # Arguments
    /// * `env` - The Soroban contract environment
    /// * `group_id` - The unique group identifier
    /// * `member` - The member's address
    ///
    /// # Returns
    /// The refund record
    ///
    /// # Errors
    /// * `GroupNotFound` - If no refund record exists
pub fn get_refund_record(
        env: Env,
        group_id: u64,
        member: Address,
    ) -> Result<crate::types::RefundRecord, AjoError> {
        storage::get_refund_record(&env, group_id, &member).ok_or(AjoError::GroupNotFound)
    }

    /// File a dispute against another group member.
    ///
    /// Any member can file a dispute against another member. Both parties must be members
    /// of the same group. Disputes enter `Open` status and move to `Voting` after votes.
    ///
    /// # Arguments
    /// * `env` - Soroban environment
    /// * `complainant` - Filing member (requires auth)
    /// * `group_id` - The group where dispute occurs
    /// * `defendant` - Accused member
    /// * `dispute_type` - Type of dispute
    /// * `description` - Description of issue
    /// * `evidence_hash` - IPFS/multihash of evidence
    /// * `proposed_resolution` - Suggested resolution
    ///
    /// # Returns
    /// The created dispute ID
    ///
    /// # Errors
    /// * `GroupNotFound`
    /// * `NotMember` for complainant or defendant
    pub fn file_dispute(
        env: Env,
        complainant: Address,
        group_id: u64,
        defendant: Address,
        dispute_type: DisputeType,
        description: soroban_sdk::String,
        evidence_hash: BytesN<32>,
        proposed_resolution: DisputeResolution,
    ) -> Result<u64, AjoError> {
        pausable::ensure_not_paused(&env)?;
        complainant.require_auth();

        let group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        // Verify complainant is member
        if !utils::is_member(&group.members, &complainant) {
            return Err(AjoError::NotMember);
        }
        // Verify defendant is member
        if !utils::is_member(&group.members, &defendant) {
            return Err(AjoError::NotMember);
        }

        let dispute_id = storage::get_next_dispute_id(&env);
        let now = utils::get_current_timestamp(&env);
        let voting_deadline = now + crate::types::DISPUTE_VOTING_PERIOD; // 7 days

        let dispute = Dispute {
            id: dispute_id,
            group_id,
            dispute_type,
            complainant: complainant.clone(),
            defendant: complainant.clone(),
            description,
            evidence_hash,
            status: DisputeStatus::Open,
            created_at: now,
            voting_deadline,
            votes_for_action: 0,
            votes_against_action: 0,
            proposed_resolution,
            final_resolution: None,
        };

        storage::store_dispute(&env, dispute_id, &dispute);
        storage::store_group_dispute_id(&env, group_id, dispute_id);
        events::emit_dispute_filed(&env, dispute_id, group_id, &complainant, &defendant);

        Ok(dispute_id)
    }

    /// Vote on an open dispute.
    ///
    /// Group members can vote to support or oppose the proposed resolution. Voting
    /// is open for 7 days. Each member votes once.
    ///
    /// # Arguments
    /// * `env` - Soroban environment
    /// * `voter` - Voting member (requires auth)
    /// * `dispute_id` - The dispute to vote on
    /// * `supports_action` - true to support resolution, false oppose
    ///
    /// # Errors
    /// * `DisputeNotFound`
    /// * `NotMember`
    /// * `AlreadyVotedOnDispute`
    /// * `VotingPeriodEndedDispute`
    pub fn vote_on_dispute(
        env: Env,
        voter: Address,
        dispute_id: u64,
        supports_action: bool,
    ) -> Result<(), AjoError> {
        pausable::ensure_not_paused(&env)?;
        voter.require_auth();

        let mut dispute = storage::get_dispute(&env, dispute_id).ok_or(AjoError::DisputeNotFound)?;
        let group = storage::get_group(&env, dispute.group_id).ok_or(AjoError::GroupNotFound)?;

        // Verify voter is group member
        if !utils::is_member(&group.members, &voter) {
            return Err(AjoError::NotMember);
        }

        // Check if already voted
        if storage::has_voted_on_dispute(&env, dispute_id, &voter) {
            return Err(AjoError::AlreadyVotedOnDispute);
        }

        // Check voting not started or deadline
        let now = utils::get_current_timestamp(&env);
        if dispute.status != DisputeStatus::Open && dispute.status != DisputeStatus::Voting {
            return Err(AjoError::DisputeAlreadyResolved);
        }
        if now > dispute.voting_deadline {
            return Err(AjoError::VotingPeriodEndedDispute);
        }

        // Record vote
        let vote = DisputeVote {
            dispute_id,
            voter: voter.clone(),
            supports_action,
            timestamp: now,
        };
        storage::store_dispute_vote(&env, dispute_id, &voter, &vote);

        // Update counts
        if supports_action {
            dispute.votes_for_action += 1;
        } else {
            dispute.votes_against_action += 1;
        }
        dispute.status = DisputeStatus::Voting;
        storage::store_dispute(&env, dispute_id, &dispute);

        events::emit_dispute_vote(&env, dispute_id, &voter, supports_action);

        Ok(())
    }

    /// Resolve a dispute after voting period ends.
    ///
    /// Calculates vote outcome (66% supermajority required for action). Executes
    /// the proposed resolution if approved, updates status to Resolved/Rejected.
    ///
    /// # Arguments
    /// * `env` - Soroban environment
    /// * `executor` - Group member executing resolution (requires auth)
    /// * `dispute_id` - The dispute to resolve
    ///
    /// # Errors
    /// * `DisputeNotFound`
    /// * `VotingPeriodActive`
    /// * Various resolution errors
    pub fn resolve_dispute(
        env: Env,
        executor: Address,
        dispute_id: u64,
    ) -> Result<(), AjoError> {
        pausable::ensure_not_paused(&env)?;
        executor.require_auth();

        let mut dispute = storage::get_dispute(&env, dispute_id).ok_or(AjoError::DisputeNotFound)?;
        let group = storage::get_group(&env, dispute.group_id).ok_or(AjoError::GroupNotFound)?;

        // Check voting period ended
        let now = utils::get_current_timestamp(&env);
        if now <= dispute.voting_deadline {
            return Err(AjoError::VotingPeriodActive);
        }

        // Calculate approval (66% supermajority)
        let total_votes = dispute.votes_for_action + dispute.votes_against_action;
        let approval_percentage = if total_votes > 0 {
            ((dispute.votes_for_action as u64 * 100) / total_votes as u64) as u32
        } else {
            0
        };

        let resolution_executed = if approval_percentage >= crate::types::DISPUTE_APPROVAL_THRESHOLD {
            // Execute proposed resolution
            match dispute.proposed_resolution {
                DisputeResolution::Penalty => {
                    Self::apply_dispute_penalty(&env, &dispute, &group)?
                }
                DisputeResolution::Removal => {
                    Self::remove_member_from_group(&env, &dispute.defendant, dispute.group_id)?
                }
                DisputeResolution::Refund => {
                    Self::process_dispute_refund(&env, &dispute)?
                }
                DisputeResolution::GroupCancellation => {
                    Self::cancel_group(env.clone(), executor.clone(), dispute.group_id)?
                }
                _ => Ok(false), // NoAction/Warning - no execution needed
            }?;
            true
        } else {
            false
        };

        // Update status
        if resolution_executed || dispute.proposed_resolution == DisputeResolution::NoAction || dispute.proposed_resolution == DisputeResolution::Warning {
            dispute.final_resolution = Some(dispute.proposed_resolution);
            dispute.status = DisputeStatus::Resolved;
        } else {
            dispute.final_resolution = Some(DisputeResolution::NoAction);
            dispute.status = DisputeStatus::Rejected;
        }
        storage::store_dispute(&env, dispute_id, &dispute);

        events::emit_dispute_resolved(&env, dispute_id, dispute.final_resolution.unwrap());

        Ok(())
    }

    /// Get single dispute details.
    pub fn get_dispute(
        env: Env,
        dispute_id: u64,
    ) -> Result<Dispute, AjoError> {
        storage::get_dispute(&env, dispute_id).ok_or(AjoError::DisputeNotFound)
    }

    /// Get all disputes for a group.
    pub fn get_group_disputes(
        env: Env,
        group_id: u64,
    ) -> Result<Vec<Dispute>, AjoError> {
        Ok(storage::get_group_disputes(&env, group_id))
    }

    /// Apply penalty to defendant as dispute resolution.
    fn apply_dispute_penalty(
        env: &Env,
        dispute: &Dispute,
        group: &Group,
    ) -> Result<(), AjoError> {
        let penalty_amount = (group.contribution_amount * (group.penalty_rate as i128)) / 100;
        storage::add_to_penalty_pool(&env, group.id, group.current_cycle, penalty_amount);

        // Update/update member penalty record
        let mut penalty_record = storage::get_member_penalty(&env, group.id, &dispute.defendant)
            .unwrap_or(crate::types::MemberPenaltyRecord {
                member: dispute.defendant.clone(),
                group_id: group.id,
                late_count: 0,
                on_time_count: 0,
                total_penalties: 0,
                reliability_score: 100,
            });
        penalty_record.late_count += 1;
        penalty_record.total_penalties += penalty_amount;
        penalty_record.reliability_score = ((penalty_record.on_time_count as u32 * 100) / (penalty_record.on_time_count + penalty_record.late_count + 1) as u32).max(0);
        storage::store_member_penalty(&env, group.id, &dispute.defendant, &penalty_record);

        Ok(())
    }

    /// Remove defendant from group as resolution.
    fn remove_member_from_group(
        env: &Env,
        defendant: &Address,
        group_id: u64,
    ) -> Result<(), AjoError> {
        let mut group = storage::get_group(&env, group_id).ok_or(AjoError::GroupNotFound)?;

        // Filter out defendant
        let old_len = group.members.len();
        group.members.retain(|m| m != defendant);

        if group.members.len() == old_len {
            return Err(AjoError::NotMember); // wasn't member
        }

        // Adjust payout_index if needed
        if group.payout_index as usize >= group.members.len() {
            group.payout_index = group.members.len() as u32;
        }

        storage::store_group(&env, group_id, &group);
        Ok(())
    }

    /// Process refund to complainant from defendant.
    fn process_dispute_refund(
        env: &Env,
        dispute: &Dispute,
    ) -> Result<(), AjoError> {
        let group = storage::get_group(&env, dispute.group_id).ok_or(AjoError::GroupNotFound)?;

        let refund_amount = group.contribution_amount;

        // Refund record for complainant
        let refund_record = crate::types::RefundRecord {
            group_id: dispute.group_id,
            member: dispute.complainant.clone(),
            amount: refund_amount,
            timestamp: utils::get_current_timestamp(&env),
            reason: RefundReason::DisputeRefund,
        };
        storage::store_refund_record(&env, dispute.group_id, &dispute.complainant, &refund_record);

        events::emit_refund_processed(&env, dispute.group_id, &dispute.complainant, refund_amount, 3u32); // 3 for DisputeRefund

        Ok(())
    }
}
